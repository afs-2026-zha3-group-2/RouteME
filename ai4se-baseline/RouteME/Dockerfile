# Single deployable image: React build served by Spring Boot, API under /api.
# Build context: ai4se-baseline/RouteME

FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
# Lockfile lacks rolldown platform optional deps, so `npm ci` refuses; use install like CI.
RUN npm install -g npm@11 && npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk AS api
WORKDIR /build
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp -DskipTests dependency:go-offline
COPY backend/src ./src
COPY --from=web /web/dist ./src/main/resources/static
RUN ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 routeme && mkdir -p /data && chown routeme:routeme /data
COPY --from=api /build/target/routeme-backend-0.0.1-SNAPSHOT.jar app.jar
USER routeme
ENV PORT=8080 \
    SPRING_DATASOURCE_URL=jdbc:sqlite:/data/routeme.db
VOLUME ["/data"]
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]