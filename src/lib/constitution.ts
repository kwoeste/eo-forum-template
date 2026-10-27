import { siteConfig } from "@/site.config";

export const CONSTITUTION_VERSION = process.env.NEXT_PUBLIC_CONSTITUTION_VERSION || "v1";
export const CONSTITUTION_TITLE = siteConfig.constitutionTitle;
export const CONSTITUTION_DRIVE_URL = siteConfig.constitutionUrl;
