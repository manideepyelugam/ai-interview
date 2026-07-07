import { Client, Account, Databases, Storage } from "appwrite";
import { APPWRITE_CONFIG } from "@/src/constants";

const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };
