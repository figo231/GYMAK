export function ownerPushError(error, lang='ar') {
 const code=String(error?.message||error||'');
 const en=lang==='en';
 if(code.includes('sending_paused'))return en?'Sending is paused by the server. Nothing was sent.':'الإرسال متوقف من السيرفر. مفيش إشعار اتبعت.';
 if(code.includes('review_expired'))return en?'This review expired. Return to edit and review recipients again. Nothing was sent by this confirmation.':'المراجعة انتهت مدتها. ارجع للتعديل وراجع المستلمين من جديد. التأكيد ده مبعتش حاجة.';
 if(code.includes('no_eligible_devices'))return en?'No eligible devices. Nothing was sent.':'مفيش أجهزة مؤهلة. مفيش إشعار اتبعت.';
 return en?'Result not confirmed. Refresh history before continuing. Do not create a duplicate campaign.':'النتيجة مش مؤكدة. حدّث السجل قبل المتابعة، وما تعملش حملة مكررة.';
}
export function ownerPushBatchResult(data,lang='ar') {
 const more=Number(data?.attempted||0)+Number(data?.skipped||0)>=50;
 const en=lang==='en';
 const accepted=Number(data?.accepted_by_fcm||0),unknown=Number(data?.outcome_unknown||0);
 return {more,message:en?`${more?'Batch checked. Continue this same campaign.':'Confirmation completed. Returned to the send form.'} Service accepted: ${accepted}. Unknown: ${unknown}. Acceptance is not receipt.`:`${more?'اتراجعت دفعة. كمّل نفس الحملة.':'تم التأكيد ورجعناك لصفحة الإرسال.'} قبلته الخدمة: ${accepted}. نتيجة مجهولة: ${unknown}. القبول مش تأكيد وصول.`};
}
