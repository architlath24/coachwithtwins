output "instance_public_ip" {
  value = aws_eip.fittwins_eip.public_ip
}
output "instance_id" {
  value = aws_instance.fittwins_server.id
}
output "vpc_id" {
  value = aws_vpc.fittwins_vpc.id
}
