pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "architlath24/fittwins"
        DOCKER_TAG = "${BUILD_NUMBER}"
        EC2_HOST = "3.7.38.209"
        EC2_USER = "ec2-user"
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
                    docker build \
                      -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                      -t ${DOCKER_IMAGE}:latest \
                      .
                '''
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login \
                          -u "$DOCKER_USER" \
                          --password-stdin

                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push ${DOCKER_IMAGE}:latest

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['fittwins-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no \
                            ${EC2_USER}@${EC2_HOST} '
                                set -e
                                cd ${EC2_DIR}
                                git pull origin main
                                docker build -t fittwins-frontend .
                                docker rm -f fittwins-frontend || true
                                docker run -d \
                                  --name fittwins-frontend \
                                  --network fittwins-net \
                                  --restart unless-stopped \
                                  -p 80:80 \
                                  fittwins-frontend
                            '
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sshagent(credentials: ['fittwins-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no \
                            ${EC2_USER}@${EC2_HOST} '
                                set -e
                                docker ps --filter name=fittwins-frontend
                                curl -f http://localhost/
                                curl -f http://localhost/biological-age/
                            '
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'FitTwins deployment successful!'
        }
        failure {
            echo 'FitTwins deployment failed. Check Jenkins logs.'
        }
    }
}
