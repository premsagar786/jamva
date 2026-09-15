# SecureID — Root Dockerfile (delegates to backend/Dockerfile)
# This file exists for convenience when building from project root.
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY backend/pom.xml ./pom.xml
RUN mvn dependency:go-offline -B || echo "dependency:go-offline failed, continuing"
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
RUN addgroup -S secureid && adduser -S secureid -G secureid
COPY --from=builder /build/target/*.jar app.jar
RUN chown secureid:secureid app.jar
USER secureid
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=40s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
