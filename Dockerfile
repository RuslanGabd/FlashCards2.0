# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-24 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
COPY front ./front
# Optional BuildKit mounts support enterprise proxies without persisting credentials.
RUN --mount=type=cache,target=/root/.m2/repository \
    --mount=type=secret,id=maven_settings,target=/tmp/maven-settings.xml \
    --mount=type=secret,id=java_cacerts,target=/tmp/java-cacerts \
    if [ -f /tmp/java-cacerts ]; then export MAVEN_OPTS="-Djavax.net.ssl.trustStore=/tmp/java-cacerts"; fi; \
    if [ -f /tmp/maven-settings.xml ]; then \
      mvn -B -ntp -s /tmp/maven-settings.xml -DskipTests package; \
    else mvn -B -ntp -DskipTests package; fi

FROM eclipse-temurin:24-jre
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/flash-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "/app/app.jar"]
