// Reviewed technique references for this batch. Copy is original and simplified.
const ACE='https://www.acefitness.org/resources/everyone/exercise-library/';
const stop={ar:'ابدأ بوزن خفيف ومدى تقدر تتحكم فيه. لو حسيت بألم حاد أو في المفصل، وقف. لو الألم مستمر، اسأل مختص.',en:'Start light and use a range you can control. Stop for sharp or joint pain. Seek professional advice if pain persists.'};
function guide(source,ar,en){return {source,ar:{...ar,safety:ar.safety||stop.ar},en:{...en,safety:en.safety||stop.en}};}
export const BASIC_GUIDES={
 'barbell-row':guide(ACE+'12/bent-over-row/',{
 summary:'سحب بالبار لعضلات الظهر، والبايسبس بتساعد. ثبات جسمك أهم من وزن البار.',
 setup:'قف ورجليك بعرض الحوض تقريبًا. امسك البار وكفوفك لتحت، واثني ركبتك سنة. ادفع حوضك لورا وميل من مفصل الحوض، مش من تقويس ضهرك.',
 steps:['شد بطنك وخلّي رقبتك على امتداد ضهرك. سيب البار تحت كتفك وذراعك مفرود من غير شد مؤلم.','اسحب البار ناحية بطنك وكوعك بيتحرك لورا. خلّي صدرك ثابت، ما تقومش بجسمك عشان ترفع الوزن.','قف لحظة عند آخر مدى تقدر توصله من غير هز، وما تخبطش البار في جسمك.','انزل البار ببطء لحد وضع البداية. خُد نفس في النزول وطلّعه مع السحب.'],
 feel:'مجهود في عضلات الظهر ومعاها الذراع. عضلات الجذع بتثبتك، لكن الألم الحاد في أسفل الضهر مش مطلوب.',
 mistakes:['تحوّل كل عدة لوقفة ونزلة بالجسم.','تدوّر ضهرك أو ترفع دقنك عشان تبص في المراية.','تسحب وزن مش قادر تنزله بتحكم.']
 },{
 summary:'A barbell pull for your back, assisted by your biceps. A steady torso matters more than the weight.',
 setup:'Stand about hip-width apart. Hold the bar palms down and soften your knees. Push your hips back and hinge at the hips, rather than rounding your back.',
 steps:['Brace your trunk and keep your neck in line with your back. Let the bar hang below your shoulders with straight, comfortable arms.','Pull toward your abdomen, moving your elbows back. Keep your chest steady rather than standing up to lift.','Pause at a range you can reach without swinging. Do not slam the bar into your body.','Lower slowly to the start. Breathe in while lowering and out as you pull.'],
 feel:'Effort in your back and arms. Your trunk supports the position, but sharp low-back pain is not the goal.',
 mistakes:['Standing up and dropping down on every rep.','Rounding your back or lifting your chin to watch a mirror.','Pulling a weight you cannot lower under control.']
 }),
 'lat-pulldown':guide(ACE+'158/seated-lat-pulldown/',{
 summary:'سحب رأسي لعضلات الظهر العريضة، والبايسبس بتساعد. البار بينزل قدام جسمك، مش ورا رقبتك.',
 setup:'اضبط وسادة الجهاز فوق فخادك عشان تثبتك. امسك البار بمسكة مريحة أوسع شوية من كتفك، وثبّت رجليك. ميل لورا ميل بسيط وخلّي بطنك مشدودة.',
 steps:['ابدأ وذراعك فوقك في مدى مريح، من غير ما تسيب الوزن يشدك من الكرسي.','نزّل كتفك بهدوء، وبعدها اسحب كوعك لتحت ناحية جنبك والبار ناحية أعلى صدرك. طلّع النفس مع السحب.','وقف السحب لما كوعك يبطل ينزل ويبدأ يرجع لورا. مش لازم تجبر البار يلمس صدرك.','ارجع البار لفوق ببطء وخُد نفس. خلّي جسمك ثابت، وما تسيبش الأوزان تخبط في بعضها.'],
 feel:'مجهود على جانبي الضهر وتحت الإبط، ومعاه الذراع. شد مؤلم في الكتف مش مطلوب.',
 mistakes:['السحب ورا الرقبة.','ترجع بجسمك لورا مع كل عدة وكأنك بتجدف.','تسحب زيادة عن مداك أو تسيب البار يفلت لفوق.']
 },{
 summary:'A vertical pull for your lats, assisted by your biceps. Pull in front of your body, not behind your neck.',
 setup:'Adjust the thigh pad to hold you in the seat. Take a comfortable grip slightly wider than your shoulders and plant your feet. Lean back a little and brace your trunk.',
 steps:['Start with your arms overhead in a comfortable range, without letting the weight pull you off the seat.','Gently lower your shoulders, then drive your elbows down toward your sides and the bar toward your upper chest. Breathe out.','Stop when your elbows stop moving down and begin moving backward. Do not force the bar to touch your chest.','Return slowly overhead while breathing in. Keep your torso steady and do not let the weight stack crash.'],
 feel:'Effort along the sides of your back and in your arms. Painful shoulder strain is not required.',
 mistakes:['Pulling behind your neck.','Rocking backward on every rep as if rowing.','Pulling beyond your range or letting the bar fly upward.']
 }),
 'lateral-raise':guide(ACE+'26/lateral-raise/',{
 summary:'رفرفة بالدمبل لعضلات الكتف الجانبية. دمبل خفيف وتحكم كويس أفضل من وزن تقيل مع هز الجسم.',
 setup:'قف بثبات والدمبل جنب فخادك، وكفك ناحية جسمك. اثني كوعك سنة، وشد بطنك من غير ما تحبس نفسك.',
 steps:['ارفع ذراعك للجانبين بهدوء والكوع والذراع طالعين مع بعض. طلّع النفس وأنت بترفع.','قف عند مستوى الكتف أو أقل لو ده المدى المريح ليك. خلّي رسغك مستقيم وإبهامك مش متقلب لتحت.','حافظ على نفس الثني البسيط في الكوع، ومن غير ما تميل بضهرك أو ترفع كتفك لودنك.','نزّل الدمبل ببطء وخُد نفس. اتحكم في النزول بدل ما تسيبه يقع.'],
 feel:'مجهود في جانب الكتف. مش لازم تحس بحرق شديد عشان العدة تبقى مفيدة، والألم المفصلي علامة توقف.',
 mistakes:['تهز جسمك عشان ترمي الدمبل لفوق.','ترفع كتفك ناحية ودنك أو تكسر رسغك.','تزود المدى رغم وجود ألم.']
 },{
 summary:'A dumbbell raise for the side of your shoulders. Light weights with control beat heavy swinging.',
 setup:'Stand steadily with dumbbells beside your thighs, palms toward your body. Keep a slight elbow bend and brace without holding your breath.',
 steps:['Raise your arms slowly out to the sides, with elbows and upper arms moving together. Breathe out.','Stop at shoulder height, or lower if that is your comfortable range. Keep wrists neutral and avoid turning your thumbs down.','Keep the same slight elbow bend. Do not lean back or shrug toward your ears.','Lower slowly while breathing in. Control the descent rather than dropping the weights.'],
 feel:'Effort at the side of your shoulders. A strong burning feeling is not required, and joint pain is a reason to stop.',
 mistakes:['Swinging your torso to throw the weights up.','Shrugging toward your ears or bending your wrists.','Forcing a larger range despite pain.']
 }),
 'pushup':guide(ACE+'41/push-up/',{
 summary:'تمرين دفع بوزن الجسم للصدر والترايسبس والكتف الأمامي. جسمك يطلع وينزل كوحدة واحدة.',
 setup:'حط كفك على الأرض عند عرض الكتف أو أوسع شوية. افرد رجليك وارتكز على مشط رجلك، وشد بطنك ومؤخرتك عشان جسمك يبقى في خط واحد.',
 steps:['خلّي رقبتك على امتداد جسمك، وبص للأرض قدام إيدك بشوية. وزّع الضغط على كفك كله.','اثني كوعك وانزل بصدرك بهدوء في مدى مريح، من غير ما بطنك تقع أو حوضك يعلى. خُد نفس.','ادفع الأرض بعيد عنك وطلّع النفس، وارجع لحد ما ذراعك يفرد بتحكم.','لو مش قادر تثبت جسمك، جرّب بإيدك على سطح ثابت عالي، زي حائط أو بنش ثابت، بدل ما تكمل بعدات مهزوزة.'],
 feel:'مجهود في الصدر والترايسبس، والبطن بتثبت الجسم. ألم الرسغ أو الكتف مش حاجة تكمل عليها.',
 mistakes:['تنزل بطنك قبل صدرك أو ترفع حوضك بزيادة.','تطلع راسك لقدام عشان تلمس الأرض.','تختار مستوى أصعب من قدرتك على التحكم.']
 },{
 summary:'A bodyweight press for your chest, triceps and front shoulders. Your body moves as one unit.',
 setup:'Place your hands about shoulder-width apart or slightly wider. Extend your legs onto your toes and brace your abdomen and glutes to form a straight body line.',
 steps:['Keep your neck in line and look at the floor just ahead of your hands. Spread pressure across your palms.','Bend your elbows and lower your chest slowly through a comfortable range. Do not let your abdomen sag or hips rise. Breathe in.','Push the floor away while breathing out. Return until your arms are straight and controlled.','If you cannot keep your body steady, try your hands on a stable higher surface, such as a wall or fixed bench, rather than doing shaky reps.'],
 feel:'Effort in your chest and triceps, with your abdomen holding your position. Do not push through wrist or shoulder pain.',
 mistakes:['Letting your abdomen drop first or lifting your hips too high.','Reaching forward with your head to touch the floor.','Choosing a version too hard to control.']
 }),
 'deadlift':guide(ACE+'6/deadlift/',{
 summary:'رفع البار من الأرض باستخدام الرجل والحوض، مع تثبيت الجذع. تمرين محتاج تعلم للحركة قبل زيادة الوزن.',
 setup:'قف والبار فوق منتصف قدمك وقريب من قصبة رجلك. رجليك بعرض الحوض تقريبًا. ادفع حوضك لورا واثني ركبتك عشان تمسك البار خارج رجليك بمسكة كاملة.',
 steps:['شد بطنك وثبّت ضهرك في وضعه الطبيعي ورقبتك على امتداده. قرّب البار من رجلك وشيل أي ارتخاء من المسكة قبل الرفع.','ادفع الأرض برجلك واطلع بالبار قريب من جسمك. خلّي صدرك وحوضك يطلعوا مع بعض، من غير نتشة.','قف طويل والحوض والركبة مفرودين. ما ترجعش بجسمك لورا وما تعصرش أسفل ضهرك في النهاية.','رجّع حوضك لورا وانزل البار قريب من رجلك. لما يعدّي الركبة اثنيها عشان يرجع للأرض بتحكم.','سيب البار يستقر واظبط وضعك من جديد قبل العدة اللي بعدها. لو الوضع بيتغيّر، خفّف الوزن.'],
 feel:'مجهود في المؤخرة وخلف الفخذ مع شغل من باقي الجسم. الألم الحاد في الضهر أو التنميل مش طبيعي تكمل عليه.',
 mistakes:['تشد البار فجأة أو تخلّيه بعيد عن رجلك.','حوضك يطلع الأول والبار يفضل على الأرض.','تميل لورا في النهاية أو تنط بالبار من الأرض.'],
 safety:'لو الحركة جديدة عليك، اتعلمها بوزن خفيف ومع مدرب مؤهل لو متاح. ما تزودش الوزن قبل ثبات الوضع. وقف لو في ألم حاد أو تنميل، ولو مستمر اسأل مختص.'
 },{
 summary:'Lift the bar from the floor using your legs and hips while stabilizing your trunk. Learn the movement before adding weight.',
 setup:'Stand with the bar over your midfoot, close to your shins, feet roughly hip-width apart. Push your hips back and bend your knees to take a full grip outside your legs.',
 steps:['Brace your abdomen, hold your natural back position and align your neck. Keep the bar close and take slack out of your grip before lifting.','Push through the floor and raise the bar close to your body. Let your chest and hips rise together without jerking.','Finish standing tall with hips and knees extended. Do not lean backward or squeeze your lower back at the top.','Move your hips back and lower the bar close to your legs. Bend your knees as the bar passes them to return it to the floor under control.','Let the bar settle and reset before the next rep. Reduce the weight if your position changes.'],
 feel:'Effort in your glutes and back of your thighs, with the rest of your body assisting. Do not continue through sharp back pain or numbness.',
 mistakes:['Jerking the bar or letting it drift away from your legs.','Raising your hips first while the bar stays on the floor.','Leaning back at the top or bouncing off the floor.'],
 safety:'If new to this movement, learn with light weight and a qualified coach if available. Add weight only after you can keep your position. Stop for sharp pain or numbness; seek professional advice if it persists.'
 })
};
