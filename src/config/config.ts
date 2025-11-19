export default () => ({
    jwt: {
        secret: process.env.JWT_SECRET || 'change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    database: {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'crime_alert',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
});
