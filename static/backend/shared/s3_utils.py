"""
Shared S3 utilities for model upload and management
"""

import os
import boto3
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class S3ModelUploader:
    """Simple S3 uploader for 3D models with automatic presigned URL generation"""

    def __init__(self):
        self.bucket = os.environ.get('S3_BUCKET')
        self.region = os.environ.get('AWS_REGION', 'us-west-2')
        self.client = None
        self.enabled = False

        if self.bucket:
            try:
                # Initialize S3 client - Pod Identity provides credentials automatically
                self.client = boto3.client('s3', region_name=self.region)
                self.enabled = True
                logger.info(f"S3 client initialized for bucket: {self.bucket}")

                # Test access
                try:
                    self.client.head_bucket(Bucket=self.bucket)
                    logger.info(f"Successfully connected to S3 bucket: {self.bucket}")
                except ClientError as e:
                    error_code = e.response['Error']['Code']
                    if error_code == '404':
                        logger.error(f"S3 bucket {self.bucket} does not exist")
                    else:
                        logger.error(f"Cannot access S3 bucket {self.bucket}: {e}")
                    self.enabled = False
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.enabled = False
        else:
            logger.warning("S3_BUCKET environment variable not set - S3 upload disabled")

    def upload_model(
        self,
        job_id: str,
        model_data: bytes,
        model_type: str = "glb",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, str]]:
        """
        Upload model to S3 and return presigned URL

        Args:
            job_id: Unique job identifier
            model_data: Binary model data
            model_type: File extension (glb, obj, ply, etc.)
            metadata: Optional metadata to attach to the S3 object

        Returns:
            Dict with 's3_key' and 'presigned_url' if successful, None otherwise
        """
        if not self.enabled or not self.client:
            logger.warning("S3 upload not available")
            return None

        try:
            # Generate S3 key
            key = f"models/{job_id}/model.{model_type}"

            # Prepare metadata
            s3_metadata = {
                'job_id': job_id,
                'uploaded_at': datetime.utcnow().isoformat(),
                'model_type': model_type
            }

            if metadata:
                # Convert all metadata values to strings (S3 requirement)
                for k, v in metadata.items():
                    s3_metadata[k] = str(v)

            # Determine content type
            content_types = {
                'glb': 'model/gltf-binary',
                'gltf': 'model/gltf+json',
                'obj': 'model/obj',
                'ply': 'model/ply',
                'stl': 'model/stl',
                'usdz': 'model/vnd.usdz+zip'
            }
            content_type = content_types.get(model_type, 'application/octet-stream')

            # Upload to S3
            logger.info(f"Uploading {len(model_data)} bytes to s3://{self.bucket}/{key}")
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=model_data,
                ContentType=content_type,
                Metadata=s3_metadata
            )

            # Generate presigned URL (24 hour expiry)
            presigned_url = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key
                },
                ExpiresIn=86400  # 24 hours
            )

            logger.info(f"Successfully uploaded model to S3: {key}")

            return {
                's3_key': key,
                'presigned_url': presigned_url,
                's3_bucket': self.bucket
            }

        except ClientError as e:
            logger.error(f"S3 upload failed for job {job_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during S3 upload for job {job_id}: {e}")
            return None

    def get_presigned_url(self, s3_key: str, expiry: int = 86400) -> Optional[str]:
        """
        Generate a presigned URL for an existing S3 object

        Args:
            s3_key: S3 object key
            expiry: URL expiry time in seconds (default 24 hours)

        Returns:
            Presigned URL string if successful, None otherwise
        """
        if not self.enabled or not self.client:
            return None

        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': s3_key
                },
                ExpiresIn=expiry
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {s3_key}: {e}")
            return None

    def upload_image(
        self,
        image_data: bytes,
        image_id: str,
        content_type: str = "image/jpeg"
    ) -> Optional[Dict[str, str]]:
        """
        Upload image to S3 images/ prefix

        Args:
            image_data: Binary image data
            image_id: Unique image identifier
            content_type: MIME type (image/jpeg, image/png, etc.)

        Returns:
            Dict with 's3_key', 's3_uri', and 'presigned_url' if successful
        """
        if not self.enabled or not self.client:
            logger.warning("S3 upload not available")
            return None

        try:
            # Determine file extension from content type
            ext_map = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp',
                'image/gif': 'gif'
            }
            ext = ext_map.get(content_type, 'jpg')

            # Generate S3 key with images/ prefix
            key = f"images/{image_id}.{ext}"

            # Upload to S3
            logger.info(f"Uploading {len(image_data)} bytes to s3://{self.bucket}/{key}")
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=image_data,
                ContentType=content_type,
                Metadata={
                    'image_id': image_id,
                    'uploaded_at': datetime.utcnow().isoformat()
                }
            )

            # Generate presigned URL (24 hour expiry)
            presigned_url = self.get_presigned_url(key, expiry=86400)

            logger.info(f"Successfully uploaded image to S3: {key}")

            return {
                's3_key': key,
                's3_uri': f"s3://{self.bucket}/{key}",
                'presigned_url': presigned_url,
                's3_bucket': self.bucket
            }

        except Exception as e:
            logger.error(f"Failed to upload image {image_id}: {e}")
            return None

    def delete_model(self, job_id: str, model_type: str = "glb") -> bool:
        """
        Delete a model from S3

        Args:
            job_id: Job identifier
            model_type: File extension

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            return False

        try:
            key = f"models/{job_id}/model.{model_type}"
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted S3 object: {key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete S3 object for job {job_id}: {e}")
            return False


class JobManager:
    """Simple in-memory job manager (use Redis in production)"""

    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(self, job_id: str, model: str, input_type: str = "image") -> Dict[str, Any]:
        """Create a new job entry"""
        job = {
            'id': job_id,
            'status': 'queued',
            'model': model,
            'input_type': input_type,
            'created_at': datetime.utcnow().isoformat(),
            'progress': 0
        }
        self.jobs[job_id] = job
        return job

    def update_job(self, job_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update job status and attributes"""
        if job_id not in self.jobs:
            return None

        self.jobs[job_id].update(kwargs)

        # Add timestamp for status changes
        if 'status' in kwargs:
            status = kwargs['status']
            if status == 'processing':
                self.jobs[job_id]['started_at'] = datetime.utcnow().isoformat()
            elif status == 'completed':
                self.jobs[job_id]['completed_at'] = datetime.utcnow().isoformat()
            elif status == 'failed':
                self.jobs[job_id]['failed_at'] = datetime.utcnow().isoformat()

        return self.jobs[job_id]

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID"""
        return self.jobs.get(job_id)

    def list_jobs(self, limit: int = 100) -> list:
        """List recent jobs"""
        all_jobs = list(self.jobs.values())
        # Sort by creation time (newest first)
        all_jobs.sort(
            key=lambda x: x.get('created_at', ''),
            reverse=True
        )
        return all_jobs[:limit]

    def cleanup_old_jobs(self, hours: int = 1) -> int:
        """Remove completed/failed jobs older than specified hours"""
        cutoff = datetime.utcnow().isoformat()
        removed = 0

        jobs_to_remove = []
        for job_id, job in self.jobs.items():
            if job['status'] in ['completed', 'failed']:
                job_time = job.get('completed_at', job.get('failed_at', job['created_at']))
                if job_time < cutoff:  # Simplified check
                    jobs_to_remove.append(job_id)

        for job_id in jobs_to_remove:
            del self.jobs[job_id]
            removed += 1

        return removed
