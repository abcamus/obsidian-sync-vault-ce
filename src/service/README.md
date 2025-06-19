# Service layer

The service layer is primarily responsible for interacting with various cloud disk providers, as well as uploading, downloading, and file meta management. It provides a uniform interface upwards and shields the differences of various cloud disk providers downwards.

## Directory Structure

- `vendor`：cloud disk vendor
- `auth`：authorization service
- `cloud-disk-service`：service interface of cloud disks, download/upload/info/fileMng