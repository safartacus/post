# Project Summary and Service Responsibilities

This project is a Node.js-based social media/vlog platform built with a microservices architecture. Each core functionality is handled by a separate service. Services communicate via HTTP (REST API) and event-driven (Kafka) architecture. MongoDB is used as the main database, Redis for caching, Elasticsearch for search, and MinIO for media storage.

---

## 1. General Architecture and Flow

- **Microservices Architecture**: Each core function is a separate Node.js service.
- **API Gateway**: Handles all external requests, routes them to the appropriate service, and applies security and rate limiting.
- **JWT Authentication**: All services use JWT middleware for protected endpoints.
- **Kafka for Event-Driven Architecture**: Kafka is used for inter-service communication and asynchronous operations.
- **Redis for Caching**: Frequently accessed data is cached in Redis.
- **Docker Compose Orchestration**: All services, databases, and supporting infrastructure are managed and started with Docker Compose.

---

## 2. Services and Their Responsibilities

### API Gateway
- Handles all external requests and proxies them to the relevant service.
- Applies rate limiting, CORS, security, and JWT authentication middleware.

### Auth Service
- Manages user authentication (login, register), JWT token generation, and role management (admin, user).

### User Service
- Manages user profiles, settings, followers/following, and user statistics.
- Handles follow/unfollow actions, profile updates, caching with Redis, and event publishing with Kafka.

### Content Service
- Manages vlog (content) creation, updating, deletion, approval, category assignment, and content statistics.
- Handles CRUD operations, admin approval, content status management, and event publishing with Kafka.

### Comment Service
- Manages comments on content and replies to other comments (nested structure), editing, deletion, and likes.
- Handles CRUD operations, nested (hierarchical) structure, caching with Redis, and event publishing with Kafka.

### Category Service
- Manages content categories, including creation, updating, deletion, and category tree (hierarchy) management.
- Handles CRUD operations, parent-child relationships, slug generation, caching with Redis, and event publishing with Kafka.

### Media Service
- Handles uploading, processing, and storing media files such as videos, images, and audio.
- Uses MinIO for storage, presigned URLs for upload/download, media processing (thumbnails, transcoding), caching with Redis, and event publishing with Kafka.

### Notification Service
- Sends notifications to users (new follower, like, comment, system messages, etc.).
- Handles CRUD operations, read status, caching with Redis, and event listening and publishing with Kafka.

### Search Service
- Provides full-text search and filtering for content, users, and categories.
- Uses Elasticsearch for search, automatic indexing, autocomplete suggestions, and event listening with Kafka.

### Analytics Service
- Tracks and reports user and content interactions (views, likes, shares, searches, clicks, etc.).
- Handles event tracking, aggregated analytics, daily/weekly/monthly reports, caching with Redis, and event publishing with Kafka.

### Admin Service
- Provides management interfaces for admins to manage content, users, categories, notifications, and statistics.
- Only accessible by users with the admin role and integrates with other services.

---

## 3. Common Features and Security

- **JWT Authentication:** All services use JWT middleware for protected endpoints.
- **Kafka Event-Driven Architecture:** Kafka is used for inter-service communication and asynchronous operations.
- **Redis Caching:** Frequently accessed data is cached in Redis.
- **Docker Compose Orchestration:** All services, databases, and supporting infrastructure are managed and started with Docker Compose.
- **Each service has its own Dockerfile and package.json.**

---

## 4. What Has Been Done So Far?

- The basic file structure and Dockerfiles for all services have been created.
- Each service has its own model, controller, route, and middleware files.
- JWT auth middleware has been added to all services.
- Kafka integration for event flow between services has been implemented.
- Redis caching mechanism has been set up.
- MinIO, Elasticsearch, and MongoDB have been integrated as infrastructure services.
- Centralized routing and security have been established with the API Gateway.
- Example package.json and .env files have been created for each service.
- Missing or incorrect parts (e.g., auth middleware, function names, missing packages) have been fixed.
- All services have been started and are running successfully.

---

## 5. Example Service Workflows

1. **User registration:**  
   API Gateway → Auth Service → User Service
2. **User adds content:**  
   API Gateway → Content Service → Media Service (file upload) → Category Service (category selection)
3. **User searches for content:**  
   API Gateway → Search Service (Elasticsearch)
4. **User likes content:**  
   API Gateway → Content Service → Analytics Service → Notification Service
5. **User adds a comment:**  
   API Gateway → Comment Service → Notification Service
6. **Admin panel:**  
   API Gateway → Admin Service → Other services

---

## 6. Service Responsibilities at a Glance

| Service           | Responsibility                                                        |
|-------------------|-----------------------------------------------------------------------|
| API Gateway       | Handles all requests, routing, security, and rate limiting            |
| Auth Service      | Authentication, JWT generation, role management                       |
| User Service      | User profiles, follow system, settings                                |
| Content Service   | Content (vlog) management, approval, statistics                       |
| Comment Service   | Commenting, deletion, likes, nested structure                         |
| Category Service  | Category management, hierarchy, slug                                  |
| Media Service     | Media file upload, processing, storage with MinIO                     |
| Notification Svc  | Sending, reading, deleting notifications, Kafka event listening       |
| Search Service    | Full-text search, filtering, Elasticsearch                            |
| Analytics Service | Interaction tracking, reporting, aggregated analytics                 |
| Admin Service     | Admin operations, statistics, content and user management             |

---

For more details or to review the code/flow of a specific service, just ask! 