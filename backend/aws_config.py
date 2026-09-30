import json
import os
import boto3

REGION = os.getenv("AWS_REGION", "ap-south-1")
secrets = boto3.client("secretsmanager", region_name=REGION)

def get_secret(secret_id):
    response = secrets.get_secret_value(SecretId=secret_id)
    return json.loads(response["SecretString"])
