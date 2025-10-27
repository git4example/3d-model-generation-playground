"""
DynamoDB-based job manager for distributed 3D model inference
"""

import os
import boto3
import logging
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from decimal import Decimal

logger = logging.getLogger(__name__)


class DynamoDBJobManager:
    """DynamoDB-based job manager for persistent, distributed job tracking"""

    def __init__(self):
        self.table_name = os.environ.get('DYNAMODB_TABLE_NAME')
        self.region = os.environ.get('AWS_REGION', 'us-west-2')
        self.client = None
        self.table = None
        self.enabled = False

        if self.table_name:
            try:
                dynamodb = boto3.resource('dynamodb', region_name=self.region)
                self.table = dynamodb.Table(self.table_name)
                self.client = boto3.client('dynamodb', region_name=self.region)

                # Test table access
                self.table.table_status
                self.enabled = True
                logger.info(f"DynamoDB job manager initialized with table: {self.table_name}")
            except ClientError as e:
                logger.error(f"Failed to initialize DynamoDB job manager: {e}")
                self.enabled = False
            except Exception as e:
                logger.error(f"Unexpected error initializing DynamoDB: {e}")
                self.enabled = False
        else:
            logger.warning("DYNAMODB_TABLE_NAME not set - DynamoDB job tracking disabled")

    def _get_ttl_expiry(self, hours: int = 168) -> int:
        """Get TTL expiry timestamp (default 7 days)"""
        expiry_time = datetime.now(timezone.utc) + timedelta(hours=hours)
        return int(expiry_time.timestamp())

    def _convert_floats(self, obj: Any) -> Any:
        """Convert float values to Decimal for DynamoDB"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._convert_floats(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_floats(v) for v in obj]
        return obj

    def _convert_decimals(self, obj: Any) -> Any:
        """Convert Decimal values back to Python types"""
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        elif isinstance(obj, dict):
            return {k: self._convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_decimals(v) for v in obj]
        return obj

    def _retry_with_backoff(self, func, max_retries: int = 3):
        """Execute function with exponential backoff retry"""
        for attempt in range(max_retries):
            try:
                return func()
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == 'ProvisionedThroughputExceededException':
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) + (0.1 * (2 ** attempt))
                        logger.warning(f"DynamoDB throttled, retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                raise
        return None

    def create_job(self, job_id: str, model: str, input_type: str = "image") -> Dict[str, Any]:
        """Create a new job entry in DynamoDB"""
        if not self.enabled:
            logger.warning("DynamoDB job manager not enabled")
            return None

        job = {
            'job_id': job_id,
            'status': 'queued',
            'model': model,
            'input_type': input_type,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'progress': 0,
            'ttl_expiry': self._get_ttl_expiry()
        }

        # Convert floats to Decimal
        job = self._convert_floats(job)

        def put_item():
            self.table.put_item(Item=job)
            return job

        try:
            result = self._retry_with_backoff(put_item)
            logger.info(f"Created job {job_id} in DynamoDB")
            return self._convert_decimals(result)
        except Exception as e:
            logger.error(f"Failed to create job {job_id} in DynamoDB: {e}")
            return None

    def update_job(self, job_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update job status and attributes in DynamoDB"""
        if not self.enabled:
            return None

        try:
            # Build update expression
            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}

            # Always update the updated_at timestamp
            kwargs['updated_at'] = datetime.now(timezone.utc).isoformat()

            # Add timestamp for status changes
            if 'status' in kwargs:
                status = kwargs['status']
                if status == 'processing':
                    kwargs['started_at'] = datetime.now(timezone.utc).isoformat()
                elif status == 'completed':
                    kwargs['completed_at'] = datetime.now(timezone.utc).isoformat()
                    # Extend TTL for completed jobs
                    kwargs['ttl_expiry'] = self._get_ttl_expiry(168)  # 7 days
                elif status == 'failed':
                    kwargs['failed_at'] = datetime.now(timezone.utc).isoformat()
                    # Shorter TTL for failed jobs
                    kwargs['ttl_expiry'] = self._get_ttl_expiry(24)  # 1 day

            # Build the update expression
            for key, value in kwargs.items():
                # Use expression attribute names for reserved keywords
                attr_name = f"#{key}"
                attr_value = f":{key}"
                update_expr_parts.append(f"{attr_name} = {attr_value}")
                expr_attr_names[attr_name] = key
                expr_attr_values[attr_value] = self._convert_floats(value)

            update_expr = "SET " + ", ".join(update_expr_parts)

            def update_item():
                response = self.table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression=update_expr,
                    ExpressionAttributeNames=expr_attr_names,
                    ExpressionAttributeValues=expr_attr_values,
                    ReturnValues='ALL_NEW'
                )
                return response.get('Attributes', {})

            result = self._retry_with_backoff(update_item)
            logger.info(f"Updated job {job_id} in DynamoDB")
            return self._convert_decimals(result)

        except Exception as e:
            logger.error(f"Failed to update job {job_id} in DynamoDB: {e}")
            return None

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID from DynamoDB"""
        if not self.enabled:
            return None

        try:
            def get_item():
                response = self.table.get_item(Key={'job_id': job_id})
                return response.get('Item')

            result = self._retry_with_backoff(get_item)
            if result:
                return self._convert_decimals(result)
            return None

        except Exception as e:
            logger.error(f"Failed to get job {job_id} from DynamoDB: {e}")
            return None

    def list_jobs(self, limit: int = 100, model: Optional[str] = None) -> List[Dict[str, Any]]:
        """List recent jobs from DynamoDB"""
        if not self.enabled:
            return []

        try:
            if model:
                # Query using GSI for specific model
                def query_jobs():
                    response = self.table.query(
                        IndexName='model-created_at-index',
                        KeyConditionExpression=Key('model').eq(model),
                        ScanIndexForward=False,  # Sort by created_at descending
                        Limit=limit
                    )
                    return response.get('Items', [])

                items = self._retry_with_backoff(query_jobs)
            else:
                # Scan all jobs (less efficient, use sparingly)
                def scan_jobs():
                    response = self.table.scan(Limit=limit)
                    return response.get('Items', [])

                items = self._retry_with_backoff(scan_jobs)
                # Sort by created_at in memory
                items.sort(key=lambda x: x.get('created_at', ''), reverse=True)

            return [self._convert_decimals(item) for item in items[:limit]]

        except Exception as e:
            logger.error(f"Failed to list jobs from DynamoDB: {e}")
            return []

    def cleanup_old_jobs(self, hours: int = 1) -> int:
        """
        Clean up old completed/failed jobs.
        Note: With TTL enabled, DynamoDB will automatically delete expired items.
        This method is for immediate cleanup if needed.
        """
        if not self.enabled:
            return 0

        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
            cutoff_iso = cutoff.isoformat()
            removed = 0

            # Scan for old completed/failed jobs
            def scan_old_jobs():
                response = self.table.scan(
                    FilterExpression='attribute_exists(completed_at) OR attribute_exists(failed_at)'
                )
                return response.get('Items', [])

            items = self._retry_with_backoff(scan_old_jobs)

            for item in items:
                job_time = item.get('completed_at', item.get('failed_at', item.get('created_at')))
                if job_time and job_time < cutoff_iso:
                    try:
                        self.table.delete_item(Key={'job_id': item['job_id']})
                        removed += 1
                        logger.info(f"Deleted old job {item['job_id']}")
                    except Exception as e:
                        logger.error(f"Failed to delete job {item['job_id']}: {e}")

            return removed

        except Exception as e:
            logger.error(f"Failed to cleanup old jobs from DynamoDB: {e}")
            return 0

    def get_job_stats(self, model: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about jobs in the system"""
        if not self.enabled:
            return {}

        try:
            stats = {
                'total': 0,
                'queued': 0,
                'processing': 0,
                'completed': 0,
                'failed': 0
            }

            if model:
                # Query for specific model
                def query_model_jobs():
                    response = self.table.query(
                        IndexName='model-created_at-index',
                        KeyConditionExpression=Key('model').eq(model)
                    )
                    return response.get('Items', [])

                items = self._retry_with_backoff(query_model_jobs)
            else:
                # Scan all jobs
                def scan_all_jobs():
                    response = self.table.scan()
                    return response.get('Items', [])

                items = self._retry_with_backoff(scan_all_jobs)

            for item in items:
                stats['total'] += 1
                status = item.get('status', 'unknown')
                if status in stats:
                    stats[status] += 1

            return stats

        except Exception as e:
            logger.error(f"Failed to get job stats from DynamoDB: {e}")
            return {}