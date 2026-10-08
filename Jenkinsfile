pipeline {
    agent any

    environment {
        EC2_DIR = "/home/ec2-user/coachwithtwins"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    cd ${EC2_DIR}
                    docker build -t fittwins-frontend .
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker rm -f fittwins-frontend || true

                    docker run -d \
                      --name fittwins-frontend \
                      --network fittwins-net \
                      --restart unless-stopped \
                      -p 80:80 \
                      fittwins-frontend
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    sleep 5
                    curl -f http://localhost/
                    curl -f http://localhost/biological-age/
                '''
            }
        }
    }

    post {
        success {
            echo 'FitTwins CI/CD deployment successful!'
        }

        failure {
            echo 'FitTwins deployment failed.'
        }
    }
}
