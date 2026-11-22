import { verifyAdmin } from '../_shared/verifyAdmin.ts';
import { sendToDeviceToken } from '../_shared/fcmClient.ts';
import { createOwnDeviceTest } from './handler.ts';
Deno.serve(createOwnDeviceTest(verifyAdmin,sendToDeviceToken));
