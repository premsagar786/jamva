# SecureID — Multi-stage Dockerfile
# Build stage: Maven with JDK 21
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build

# Copy pom and download dependencies (layer caching) - best effort; testcontainers-redis may be absent in central
COPY pom.xml .
RUN mvn dependency:go-offline -B || echo "dependency:go-offline failed (known testcontainers-redis absent), continuing"

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage: JRE Alpine (minimal + non-root)
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup -S secureid && adduser -S secureid -G secureid

# Copy built jar from builder
COPY --from=builder /build/target/*.jar app.jar

# Change ownership
RUN chown secureid:secureid app.jar

USER secureid

EXPOSE 8080

# Healthcheck via Actuator
HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=40s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
