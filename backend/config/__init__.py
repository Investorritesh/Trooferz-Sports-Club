# Ensure PyMySQL is used as the MySQLdb driver for Django on Windows
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass
