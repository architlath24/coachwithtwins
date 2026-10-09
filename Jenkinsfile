pipeline {
    agent any

    environment {
        BACKEND_ENV = "-e AWS_ENV=true -e AWS_REGION=ap-south-1 -e RDS_SECRET_ID=fittwins/rds -e GEMINI_SECRET_ID=fittwins/gemini -e S3_BUCKET=fittwins-768296856147"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build Images') {
            steps {
                sh '''
                    GIT_SHA=$(git rev-parse --short HEAD)
                    docker build -t fittwins-backend:$GIT_SHA -f backend/Dockerfile .
                    docker tag  fittwins-backend:$GIT_SHA fittwins-backend:latest
                    docker build -t fittwins-frontend:$GIT_SHA .
                    docker tag  fittwins-frontend:$GIT_SHA fittwins-frontend:latest
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                    docker network inspect fittwins-net >/dev/null 2>&1 || docker network create fittwins-net
                    docker rm -f fittwins-backend-prev 2>/dev/null || true
                    docker rename fittwins-backend fittwins-backend-prev 2>/dev/null || true
                    docker stop fittwins-backend-prev 2>/dev/null || true
                    docker run -d --name fittwins-backend --network fittwins-net --restart unless-stopped \
                      ${BACKEND_ENV} fittwins-backend:latest
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                    docker rm -f fittwins-frontend 2>/dev/null || true
                    docker run -d --name fittwins-frontend --network fittwins-net --restart unless-stopped \
                      -p 80:80 fittwins-frontend:latest
                    sleep 3
                    docker exec fittwins-frontend nginx -s reload 2>/dev/null || true
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    sleep 3
                    curl -f http://localhost/ >/dev/null
                    curl -f http://localhost/biological-age/ >/dev/null
                    curl -f http://localhost/api/openapi.json >/dev/null
                    echo "All smoke tests passed."
                '''
            }
        }
    }

    post {
        success { echo 'FitTwins CI/CD deployment successful.' }
        failure { echo 'Deployment failed. Previous backend kept as fittwins-backend-prev for rollback.' }
    }
}
