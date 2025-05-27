# Post Platform

A microservices-based social media platform built with Node.js, MongoDB, Redis, Kafka, and Elasticsearch.

## Services

- **API Gateway** (Port: 3000): Main entry point for all client requests
- **Auth Service** (Port: 3001): Handles user authentication and authorization
- **User Service** (Port: 3002): Manages user profiles and relationships
- **Content Service** (Port: 3003): Handles posts and content management
- **Comment Service** (Port: 3004): Manages comments on posts
- **Notification Service** (Port: 3005): Handles real-time notifications
- **Search Service** (Port: 3006): Provides search functionality
- **Category Service** (Port: 3007): Manages content categories
- **Media Service** (Port: 3008): Handles file uploads and media processing
- **Analytics Service** (Port: 3009): Tracks and analyzes platform metrics
- **Admin Service** (Port: 3010): Provides administrative functionality

## Prerequisites

- Docker
- Docker Compose
- Node.js 18+
- MongoDB
- Redis
- Kafka
- Elasticsearch
- MinIO

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/post.git
cd post
```

2. Create a `.env` file in each service directory with the required environment variables.

3. Start the services:
```bash
docker compose up -d
```

4. The API will be available at `http://localhost:3000`

## Development

Each service is a standalone Node.js application with its own dependencies and configuration. To work on a specific service:

1. Navigate to the service directory:
```bash
cd service-name
```

2. Install dependencies:
```bash
npm install
```

3. Start the service in development mode:
```bash
npm run dev
```

## API Documentation

API documentation is available at `http://localhost:3000/api-docs` when the API Gateway is running.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 