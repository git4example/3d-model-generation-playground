# 3D Model Inference - Frontend

A Next.js 15 application for AI-powered 3D model generation from images, featuring a modern UI with real-time generation across multiple AI services.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Backend Services**: Running TripoSR, Stable3DGen, and Direct3D-S2 services

## 🏗️ Architecture

This frontend follows a **Service-Oriented Architecture (SOA)** pattern with clear separation of concerns:

```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # BFF (Backend-for-Frontend) routes
│   ├── create/            # Image generation page
│   ├── preview/           # Image preview & 3D generation trigger
│   └── model/             # 3D model viewer & results
├── client/                # HTTP client configuration
│   └── client.ts          # Axios instances with SSR/browser routing
├── services/              # Business logic layer
│   ├── modelGeneration.ts # 3D generation orchestration
│   └── assetManagement.ts # Gallery & job management
├── components/            # React components
│   └── ui/               # shadcn/ui component library
├── hooks/                # Custom React hooks
└── lib/                  # Utility functions
    └── utils.ts          # Tailwind CSS utilities
```

For detailed architecture documentation, see [FRONTEND-ARCHITECTURE.md](../docs/FRONTEND-ARCHITECTURE.md)

## 🔧 Environment Variables

### Required Variables

Create a `.env.local` file in the frontend directory:

```bash
# CloudFront URL for public API access (browser-side)
NEXT_PUBLIC_API_BASE_URL=https://your-cloudfront-url.cloudfront.net

# Optional: CloudFront URL for image assets
NEXT_PUBLIC_CLOUDFRONT_URL=https://your-assets-cloudfront-url.cloudfront.net
```

### Kubernetes Environment Variables (SSR)

These are injected via Helm during deployment:

```bash
# Internal Kubernetes service URLs (server-side only)
TRIPOSR_SERVICE_URL=http://triposr-service.3d-inferencing.svc.cluster.local:8000
STABLE3DGEN_SERVICE_URL=http://stable3dgen-service.3d-inferencing.svc.cluster.local:8000
DIRECT3DS2_SERVICE_URL=http://direct3d-s2-service.3d-inferencing.svc.cluster.local:8000
ASSET_MANAGER_SERVICE_URL=http://asset-manager-service.3d-inferencing.svc.cluster.local:8000
K8S_NAMESPACE=3d-inferencing
```

## 📦 Key Dependencies

### Core Framework
- **Next.js 15.2.4** - React framework with App Router
- **React 18.3.1** - UI library (downgraded from 19 for Three.js compatibility)
- **TypeScript 5** - Type safety

### 3D Rendering
- **Three.js 0.169.0** - 3D graphics library
- **@react-three/fiber 8.17.10** - React renderer for Three.js
- **@react-three/drei 9.114.3** - Useful helpers for react-three-fiber

### UI Components
- **shadcn/ui** - Radix UI + Tailwind CSS components
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Icon library

### HTTP & Data
- **Axios 1.12.2** - HTTP client
- **React Hook Form** - Form management
- **Zod** - Schema validation

## 🎨 UI Component Library

This project uses [shadcn/ui](https://ui.shadcn.com/) components. To add new components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

Components are installed in `src/components/ui/` and can be customized.

## 🔄 Development Workflow

### 1. Create Page (`/create`)
- User generates image via Amazon Nova Canvas or Stable Diffusion 3.5
- Image stored in S3, URL saved to sessionStorage
- Redirects to preview page

### 2. Preview Page (`/preview`)
- Displays generated image
- User triggers 3D generation across all services
- Calls `modelGenerationService.generateAllServicesFromS3()`
- Results stored in sessionStorage
- Redirects to model page

### 3. Model Page (`/model`)
- Loads 3D generation results from sessionStorage
- Displays models with Three.js viewer
- Shows model information (format, vertices, file size)
- Provides download links

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Production
npm run build        # Create optimized production build
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors automatically

# Type Checking
npx tsc --noEmit     # Check TypeScript types without building
```

## 🐳 Docker Deployment

### Build Docker Image

```bash
# From frontend directory
docker build -t 3d-model-frontend:latest .

# Or use the provided script
./skaffold-dev.sh
```

### Run Locally with Docker

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=https://your-api.com \
  3d-model-frontend:latest
```

## ☸️ Kubernetes Deployment

### Using Helm

```bash
# Install/upgrade frontend
helm upgrade --install frontend ./helm/frontend \
  --set image.tag=latest \
  --set env.nextPublicApiBaseUrl=$CLOUDFRONT_URL \
  --set env.k8sNamespace=3d-inferencing \
  --namespace 3d-inferencing
```

### Environment Configuration

Edit `helm/frontend/values.yaml`:

```yaml
env:
  nextPublicApiBaseUrl: "https://your-cloudfront-url.cloudfront.net"
  triposrServiceUrl: "http://triposr-service.3d-inferencing.svc.cluster.local:8000"
  stable3dgenServiceUrl: "http://stable3dgen-service.3d-inferencing.svc.cluster.local:8000"
  direct3ds2ServiceUrl: "http://direct3d-s2-service.3d-inferencing.svc.cluster.local:8000"
  assetManagerServiceUrl: "http://asset-manager-service.3d-inferencing.svc.cluster.local:8000"
  k8sNamespace: "3d-inferencing"
```

## 🧪 Testing

### Manual Testing

1. Start the development server: `npm run dev`
2. Navigate to [http://localhost:3000](http://localhost:3000)
3. Test the workflow:
   - Generate an image on `/create`
   - Preview and trigger 3D generation on `/preview`
   - View results on `/model`

### API Testing

Test BFF routes directly:

```bash
# Test TripoSR generation
curl -X POST http://localhost:3000/api/triposr/generate-from-s3 \
  -H "Content-Type: application/json" \
  -d '{"s3_uri": "s3://bucket/image.png", "mc_resolution": 256}'

# Check job status
curl http://localhost:3000/api/triposr/status/job-123
```

## 🔍 Troubleshooting

### Build Errors

**Issue**: `Module not found: Can't resolve '@/...'`
- **Solution**: Check `tsconfig.json` has correct path mappings

**Issue**: `Peer dependency warnings with Three.js`
- **Solution**: Ensure React 18.3.1 is installed (not React 19)

### Runtime Errors

**Issue**: `Failed to fetch from backend services`
- **Solution**: Check environment variables are set correctly
- Verify backend services are running
- Check network connectivity

**Issue**: `3D models not loading`
- **Solution**: Verify S3 URLs are accessible
- Check CORS configuration on S3 bucket
- Ensure model files exist at specified URLs

### Development Server Issues

**Issue**: `Port 3000 already in use`
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Frontend Architecture](../docs/FRONTEND-ARCHITECTURE.md)
- [API Documentation](../docs/API.md)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run linter: `npm run lint`
4. Test your changes locally
5. Commit with clear message: `git commit -m "feat: add new feature"`
6. Push and create a pull request

## 📝 Code Style

- Use TypeScript for all new files
- Follow ESLint rules (run `npm run lint`)
- Use functional components with hooks
- Keep components small and focused
- Use the service layer for business logic
- Document complex logic with comments

## 🔐 Security Notes

- Never commit `.env.local` or secrets
- Use environment variables for all configuration
- Validate user input with Zod schemas
- Sanitize data before rendering
- Keep dependencies updated: `npm audit fix`

## 📊 Performance

- Next.js automatically optimizes images
- Code splitting via dynamic imports
- Server-side rendering for initial load
- Static generation where possible
- Lazy loading for 3D models

## 🐛 Known Issues

1. **Moderate severity vulnerability** in dependencies
   - Run `npm audit fix` to address
   - Review changes before committing

2. **Three.js compatibility** requires React 18
   - Do not upgrade to React 19 until Three.js ecosystem updates

## 📞 Support

For issues or questions:
- Check [Troubleshooting](#-troubleshooting) section
- Review [Architecture Documentation](../docs/FRONTEND-ARCHITECTURE.md)
- Contact the development team

## 📄 License

[Add your license information here]
