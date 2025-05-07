import dotenv from "dotenv"
import path from "path";
import { app } from "electron";

const envPath = app.isPackaged ? path.join(process.resourcesPath, '.env') : path.join(process.cwd(), '.env');

dotenv.config({path: envPath});