# Sample data and backups

The earlier user database dump has been removed from the working repository. It included a user record and password hash; do not restore or distribute it as demo content.

Create synthetic collections through the application, or use the isolated integration/browser tests. The test runner creates and removes a separate PostgreSQL database; it does not reset the development database.

Production backups belong in private, access-controlled backup storage outside Git. Rotate credentials that appeared in older repository versions; deleting the dump from the current tree does not erase Git history.
