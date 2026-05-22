import 'dotenv/config';

import { parseServerConfig } from './server.schema.js';

const serverConfig = parseServerConfig(process.env);

export default serverConfig;
