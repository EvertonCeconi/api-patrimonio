"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
require("dotenv/config");
const prisma_exception_filter_1 = require("./common/filters/prisma-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.useGlobalFilters(new prisma_exception_filter_1.PrismaExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
            const formatted = errors.flatMap((err) => {
                const constraints = err.constraints ?? {};
                return Object.keys(constraints).map((key) => ({
                    field: err.property,
                    code: mapConstraintToCode(key),
                }));
            });
            return new common_1.BadRequestException({
                errors: formatted,
            });
        },
    }));
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(() => {
    process.exit(1);
});
function mapConstraintToCode(constraint) {
    const map = {
        isIP: 'INVALID_IP',
        isNotEmpty: 'REQUIRED',
        isString: 'INVALID_TYPE',
        isEnum: 'INVALID_ENUM',
    };
    return map[constraint] || 'INVALID_FIELD';
}
//# sourceMappingURL=main.js.map