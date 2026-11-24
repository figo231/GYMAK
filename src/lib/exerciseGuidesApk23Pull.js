const safety = {
 ar: 'ابدأ بمقاومة تقدر تتحكم فيها من أول عدة لآخر عدة. وقف لو في ألم حاد أو مفصلي، ولو مستمر اسأل مختص. لو مش متأكد من ضبط الجهاز أو الحركة، اطلب من مدرب يراجعك.',
 en: 'Start with resistance you can control from the first rep to the last. Stop for sharp or joint pain and seek professional advice if it persists. Ask a trainer to check equipment setup or technique if unsure.'
};
function guide(source, ar, en) { return { source, ar: { safety: safety.ar, ...ar }, en: { safety: safety.en, ...en } }; }
export const APK23_PULL_GUIDES = {
 'pullup': guide('https://www.puregym.com/exercises/back/pull-up/pull-ups/', {
  summary: 'عقلة بقبضة علوية للظهر، مع مساعدة البايسبس والساعد وعضلات الجذع. مش لازم تبدأ بوزن جسمك كامل لو مش قادر تتحكم في النزول.',
  setup: 'استخدم عقلة ثابتة وتتحمل وزنك، واتأكد من المساحة فوقك. اطلع لها من منصة ثابتة بدل نطة عشوائية. امسك أوسع من الكتفين بشوية، وكفك بعيد عن وشك وإبهامك مقفول حوالين البار.',
  steps: ['ارفع رجليك من المنصة وثبّت جسمك، والذراعين ممدودين في مدى كتف مريح. شد بطنك وخلي رجليك هادية من غير تأرجح.', 'ابدأ السحب بتحكم وفكر إنك بتنزل كوعك ناحية جنبك. طلّع النفس وأنت بتطلع، من غير رفس أو نتشة بالجسم.', 'اطلع لحد الذقن عند مستوى البار أو فوقه لو تقدر من غير مد الرقبة لقدام. مش مطلوب تضرب صدرك في البار.', 'انزل ببطء مع الشهيق لحد مد الذراعين في المدى المريح. ما تسيبش وزنك يقع على الكتف في آخر النزول.', 'كرر بنفس المدى والتحكم، وارجع للمنصة بأمان في النهاية. لو الحركة مش متحكم فيها، استخدم جهاز عقلة مساعد أو سحب أمامي بدل الغش.'],
  feel: 'مجهود في جانبي الظهر والذراعين والقبضة. الشد الحاد في الكتف أو الكوع مش جزء مطلوب من التمرين.',
  mistakes: ['ترفس برجليك أو تتأرجح عشان تكمل العدة.', 'تطلع ذقنك بمد رقبتك بدل رفع جسمك.', 'تسيب النزول سريع أو تستخدم قبضة واسعة جدًا رغم عدم الراحة.']
 }, {
  summary: 'An overhand pull-up for your back, assisted by biceps, forearms and trunk muscles. Use assistance if you cannot control your full body weight.',
  setup: 'Use a securely fixed bar rated for your weight and check overhead clearance. Reach it from a stable platform rather than an uncontrolled jump. Grip a little wider than shoulder width with palms away and thumbs wrapped around the bar.',
  steps: ['Lift your feet clear and steady your body with arms extended through a comfortable shoulder range. Brace your abdomen and keep your legs quiet.', 'Pull smoothly, thinking of driving your elbows toward your sides. Breathe out as you rise without kicking or jerking.', 'Bring your chin level with or above the bar only as far as you can without craning your neck. You do not need to hit the bar with your chest.', 'Breathe in and lower slowly until your arms extend comfortably. Do not drop suddenly onto your shoulders at the bottom.', 'Repeat with the same range and control, then return safely to the platform. Use an assisted pull-up machine or lat pulldown if control is lost.'],
  feel: 'Effort in the sides of your back, arms and grip. Sharp shoulder or elbow pain is not an intended part of the exercise.',
  mistakes: ['Kicking or swinging to finish a rep.', 'Reaching with the chin instead of lifting the body.', 'Dropping quickly or using an excessively wide, uncomfortable grip.']
 }),
 'chin-up': guide('https://www.acefitness.org/resources/everyone/exercise-library/190/chin-ups/', {
  summary: 'عقلة بقبضة عكسية، كفك ناحية وشك. بتشغّل الظهر والبايسبس، وممكن تكون أسهل من القبضة العلوية لبعض الناس، مش لكل واحد.',
  setup: 'اختار بار ثابت ومنصة ثابتة توصلك له. امسك تقريبًا بعرض الكتفين وكفك ناحيتك، بمسكة كاملة. جرّب راحة الرسغ والكوع قبل ما ترفع رجليك، واختار مساعدة لو وزن جسمك تقيل عليك.',
  steps: ['شيل رجليك من المنصة بهدوء وشد بطنك، مع الرأس في امتداد الجسم. ابدأ بذراعين ممدودين في مدى كتف مريح.', 'اسحب جسمك لفوق وطلّع النفس، والكوع نازل لقدام وجنب جسمك. حافظ على الرسغ في امتداد الساعد قدر الإمكان.', 'وصل بالذقن لمستوى البار لو تقدر من غير رفس أو مد الرقبة. اعمل وقفة قصيرة من غير ما تزق رقبتك فوق البار.', 'ارجع ببطء مع الشهيق لحد وضع البداية، من غير سقوط أو دوران بالجسم.', 'انهي المجموعة وأنت لسه قادر تتحكم. ارجع للمنصة قبل ما تفلت المسكة؛ لو محتاج تغش، زوّد المساعدة بدل زيادة العدات.'],
  feel: 'مجهود في الظهر ومقدمة الذراع والساعد. ألم الرسغ أو الكوع مع القبضة العكسية سبب لتوقف وتجربة بديل مريح، مش ضغط على الألم.',
  mistakes: ['تكسر الرسغ جامد أو تقبض أضيق من المريح.', 'تحرك رجليك وتعمل نتشة في كل عدة.', 'تترك جسمك يقع في النزول أو تلف ناحية جنب واحد.']
 }, {
  summary: 'A pull-up with an underhand grip, palms facing you. It trains the back and biceps and may feel easier than an overhand grip for some people.',
  setup: 'Choose a secure bar and a stable platform to reach it. Use a full grip around shoulder width, palms facing you. Check wrist and elbow comfort before lifting your feet and use assistance when needed.',
  steps: ['Lift your feet calmly and brace your abdomen with your head aligned with your trunk. Start with arms extended through a comfortable shoulder range.', 'Breathe out and pull upward, driving elbows down in front of and beside your body. Keep wrists aligned with forearms as comfortably as possible.', 'Bring your chin toward bar height without kicking or craning your neck. Pause briefly rather than pushing your neck over the bar.', 'Breathe in and return slowly to the start without dropping or twisting.', 'Finish while you still have control. Step back onto the platform before releasing your grip; increase assistance rather than forcing extra reps.'],
  feel: 'Effort in your back, front upper arms and forearms. Wrist or elbow pain is a reason to stop and choose a comfortable alternative, not push through.',
  mistakes: ['Bending wrists excessively or gripping uncomfortably narrow.', 'Kicking and jerking each rep.', 'Dropping on the way down or twisting toward one side.']
 }),
 'one-arm-dumbbell-row': guide('https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/', {
  summary: 'سحب دمبل بإيد واحدة للظهر، مع مساعدة البايسبس. الإيد والركبة على البنش بيساعدوك تثبّت جسمك، مش تلفه عشان تشيل وزن أكبر.',
  setup: 'حط إيد وركبة على بنش ثابت، الإيد تحت الكتف والركبة تحت الحوض تقريبًا. الرجل التانية على الأرض بثبات، والدمبل في الإيد الحرة. انحنِ من الحوض وخلي الرأس في امتداد الظهر وشد بطنك.',
  steps: ['ابدأ والدمبل تحت كتفك والذراع ممدود، من غير ما كتفك يسقط للأرض أو جسمك يلف.', 'طلّع النفس واسحب كوعك لورا قريب من جنبك، والدمبل ناحية الخصر. خلي الجذع ثابت والرسغ طبيعي.', 'وقف السحب لما توصل لأقصى مدى تقدر عليه من غير لف الجسم أو رفع الكتف ناحية الأذن. مش لازم الكوع يطلع عالي جدًا.', 'خد نفس وانزل الدمبل ببطء لنقطة البداية، مع بقاء الإيد المسنودة والقدم ثابتين.', 'كمل العدات بتحكم، ونزّل الدمبل بأمان قبل تبديل الجنب. استخدم نفس الوزن والمدى المناسبين لكل ناحية.'],
  feel: 'مجهود على جانب الظهر وخلف الإبط، ومعاه الذراع. لو كل المجهود في أسفل الظهر، خفف الوزن وراجع ثبات السند.',
  mistakes: ['تلف صدرك للسقف عشان تطلع الدمبل.', 'تسحب بالكتف ناحية الأذن أو تكسر الرسغ.', 'تسيب الدمبل يسقط أو تغيّر تقوس الظهر مع كل عدة.']
 }, {
  summary: 'A one-arm dumbbell row for your back with biceps assistance. The supported hand and knee help keep your torso steady rather than twist to lift more.',
  setup: 'Place one hand and knee on a stable bench, roughly under the shoulder and hip. Plant the other foot firmly and hold a dumbbell in the free hand. Hinge at the hips, align your head with your back and brace your abdomen.',
  steps: ['Start with the weight under your shoulder and arm extended without letting that shoulder collapse toward the floor or your trunk rotate.', 'Breathe out and draw the elbow back close to your side, moving the weight toward your waist. Keep your trunk still and wrist neutral.', 'Stop when you cannot pull farther without twisting or shrugging toward the ear. The elbow does not need to travel excessively high.', 'Breathe in and lower slowly to the start while keeping your support hand and foot stable.', 'Complete controlled reps, place the weight down safely and switch sides. Use an appropriate weight and range on both sides.'],
  feel: 'Effort along the side of your back and behind the armpit, assisted by the arm. If your lower back takes over, reduce the load and check your support.',
  mistakes: ['Turning the chest toward the ceiling to lift the weight.', 'Shrugging toward the ear or bending the wrist.', 'Dropping the weight or changing your back position each rep.']
 }),
 'rear-delt-fly': guide('https://www.puregym.com/exercises/arms-and-shoulders/rear-delt-exercises/rear-delt-flyes/', {
  summary: 'رفرفة دمبل للكتف الخلفي مع مساعدة أعلى الظهر. الشرح للنسخة واقف ومنحني من الحوض، وبتحتاج وزن أخف من تمارين السحب الكبيرة.',
  setup: 'قف بثبات والركبتين مثنيتين سنة. ادفع حوضك لورا وميل بجذعك لقدام بظهر طبيعي ورقبة في امتداده. خلّي الدمبلين متدليين تحتك ومسكة اليدين متقابلة، والكوع مثني بسيط.',
  steps: ['شد بطنك وثبّت زاوية الجذع قبل بداية الحركة. اختار دمبلين خفاف يسمحوا بالرفع من غير هز.', 'ارفع الذراعين للجانبين في قوس واسع مع طلوع النفس. خلي ثنية الكوع ثابتة بدل ما تحولها لسحب رو.', 'وقف لما الذراعين يقربوا من خط الجذع أو قبل كده لو الكتف مش مرتاح. ما تحاولش ترفعهم ورا ظهرك.', 'انزل ببطء مع الشهيق لحد ما الدمبلين يرجعوا تحتك، من غير ما تخبطهم أو تغيّر وضع ظهرك.', 'كرر بنفس التحكم. لو مش قادر تثبّت الجذع، خفف الوزن أو اطلب من مدرب يظبط لك نسخة مدعومة بدل الاستمرار بالهز.'],
  feel: 'مجهود خلف الكتف وبين لوحي الكتف بدرجة مساعدة. شد مؤلم في الرقبة أو أسفل الظهر مش الهدف.',
  mistakes: ['تهز الجذع عشان الوزن يطلع.', 'ترفع الكتف ناحية الأذن أو تبص لفوق وتكسر رقبتك.', 'تثني الكوع زيادة وتحول الرفرفة لسحب، أو ترفع الذراع أبعد من المدى المريح.']
 }, {
  summary: 'A dumbbell fly for the rear shoulders with upper-back assistance. This guide uses a standing hip hinge and needs much less weight than a heavy row.',
  setup: 'Stand steadily with softly bent knees. Push your hips back and hinge forward, keeping your natural back position and neck aligned. Let the weights hang below you with palms facing each other and elbows slightly bent.',
  steps: ['Brace and hold your trunk angle before moving. Choose light weights you can lift without swinging.', 'Breathe out and sweep your arms outward in a wide arc. Keep the elbow bend steady rather than turning it into a row.', 'Stop as your upper arms approach your trunk line, or earlier if needed for comfort. Do not force your arms behind your back.', 'Breathe in and lower slowly until the weights hang below you without banging them together or changing your back position.', 'Repeat under control. If you cannot hold the hinge, reduce the load or ask a trainer to set up a supported version instead of swinging.'],
  feel: 'Effort behind the shoulders with some work between the shoulder blades. Painful neck or lower-back strain is not the target.',
  mistakes: ['Swinging the trunk to lift the weights.', 'Shrugging or looking upward and bending the neck.', 'Bending elbows farther to row or lifting beyond a comfortable range.']
 }),
 'face-pull': guide('https://www.puregym.com/exercises/arms-and-shoulders/rear-delt-exercises/face-pulls/', {
  summary: 'سحب حبل بالكابل للكتف الخلفي وأعلى الظهر. حركة خفيفة ومتحكم فيها، مش سحب وزن كبير بالجسم أو علاج مضمون لمشاكل الكتف.',
  setup: 'ثبّت الحبل في بكرة عند مستوى أعلى الصدر إلى الوجه، واضبط وزن خفيف. امسك طرفي الحبل والكفين متقابلين، وارجع خطوة لورا. قف بعرض الكتفين أو رجل قدام التانية وثبّت بطنك.',
  steps: ['ابدأ والذراعين ممدودين قدامك في مدى مريح والكابل مشدود. خلي صدرك وحوضك ثابتين من غير ميل مبالغ لورا.', 'طلّع النفس واسحب الحبل ناحية الوجه، مع فتح الطرفين بحيث الإيدين يعدّوا على جانبي الوجه بدل ما الحبل يخبط فيه.', 'وجّه الكوعين للخارج في زاوية كتف مريحة. ما تجبرش مفصل كتفك على لف أو ارتفاع يوجعه.', 'اعمل وقفة قصيرة بتحكم لما الإيدين يقربوا من جانبي الوجه. خلي الرسغ في امتداد الساعد والرقبة هادية.', 'خد نفس وارجع ببطء لمد الذراعين، من غير سقوط الأوزان أو هز الجسم. في النهاية قرّب ناحية الجهاز بهدوء قبل ما تسيب الحبل.'],
  feel: 'مجهود خلف الكتف وأعلى الظهر، مش ضغط في مفصل الكتف أو شد رقبة شديد. لو محتاج ترجع بجسمك مع كل عدة، الوزن تقيل.',
  mistakes: ['تستخدم جسمك كمرجيحة عشان تسحب.', 'تقرّب الحبل من الوجه بسرعة أو تسيبه يرجع فجأة.', 'تجبر الكوعين فوق المدى المريح أو ترفع الكتفين ناحية الأذن.']
 }, {
  summary: 'A rope cable pull for the rear shoulders and upper back. Use a light, controlled movement, not a heavy whole-body pull or a promised treatment for shoulder problems.',
  setup: 'Secure a rope to a pulley around upper-chest to face height and select a light load. Hold both ends with palms facing each other and step back. Use a shoulder-width or staggered stance and brace your abdomen.',
  steps: ['Begin with arms extended comfortably and tension in the cable. Keep chest and hips steady without leaning far back.', 'Breathe out and draw the rope toward your face, separating the ends so your hands travel beside your face rather than the rope hitting it.', 'Guide elbows outward through a comfortable shoulder angle. Do not force rotation or height that hurts.', 'Pause briefly with control as hands approach the sides of your face. Align wrists with forearms and keep your neck relaxed.', 'Breathe in and extend your arms slowly without dropping the stack or rocking your body. Step toward the machine calmly before releasing the rope at the end.'],
  feel: 'Effort in the rear shoulders and upper back rather than joint pressure or strong neck strain. Needing to lean back each rep suggests the load is too heavy.',
  mistakes: ['Rocking the whole body to pull.', 'Pulling the rope toward the face fast or letting it snap back.', 'Forcing elbows above a comfortable range or shrugging toward the ears.']
 })
};
