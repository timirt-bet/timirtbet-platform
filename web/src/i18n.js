/* ---------- Amharic (አማርኛ) ----------
   The app renders in English; this layer swaps visible text and labels to Amharic when chosen.
   Code, test names, challenge instructions and anything people type stay as they are.
   Add a string: put the exact English text (as shown on screen) on the left. */
const I18N = (() => {
  const AM = {
    "Your repository isn't ready yet": "ማከማቻዎ ገና ዝግጁ አይደለም", "You need your own repository in the organization to submit solutions. Setting it up didn't finish when you signed in.": "መፍትሔዎችን ለማስገባት በድርጅቱ ውስጥ የራስዎ ማከማቻ ያስፈልጋል። ሲገቡ ማዘጋጀቱ አልተጠናቀቀም።",
    "Check your email for an invitation from GitHub to join the organization, and accept it.": "ድርጅቱን ለመቀላቀል ከGitHub የመጣ ግብዣ በኢሜይልዎ ይፈልጉና ይቀበሉ።", "Then press the button.": "ከዚያ ቁልፉን ይጫኑ።",
    "Set up my repository": "ማከማቻዬን አዘጋጅ", "Setting up…": "በማዘጋጀት ላይ…", "Still stuck? Send the message above to your teacher.": "አሁንም አልሰራም? ከላይ ያለውን መልእክት ለመምህርዎ ይላኩ።",
    "Starting point": "መነሻ", "what your code must do": "ኮድዎ ማድረግ ያለበት", "Solved": "የተፈቱ", "Your solution passed the grader and is saved.": "መፍትሔዎ አራሚውን አልፏል፣ ተቀምጧል።",
    "Not submitted yet": "ገና አልገባም", "Follow the steps below. Your result shows here about a minute after you commit.": "ከታች ያሉትን ደረጃዎች ይከተሉ። commit ካደረጉ ከአንድ ደቂቃ ገደማ በኋላ ውጤቱ እዚህ ይታያል።",
    "How to submit": "እንዴት እንደሚያስገቡ", "Submit a new version": "አዲስ ስሪት ያስገቡ", "Show the steps": "ደረጃዎቹን አሳይ",
    "It opens the file in your repository, ready to edit.": "ፋይሉን በማከማቻዎ ውስጥ ለማርትዕ ዝግጁ አድርጎ ይከፍተዋል።",
    "Write your solution": "መፍትሔዎን ይጻፉ", "Replace the starter code with your answer.": "የመነሻ ኮዱን በመልስዎ ይተኩ።",
    "Click “Commit changes”": "“Commit changes”ን ይጫኑ", "Keep “Commit directly to the main branch” selected, then confirm.": "“Commit directly to the main branch” እንደተመረጠ ይተዉትና ያረጋግጡ።",
    "Come back here": "ወደዚህ ይመለሱ", "The grader checks it and shows the result above.": "አራሚው ይፈትሸዋል፤ ውጤቱንም ከላይ ያሳያል።",
    "Prefer your own computer?": "የራስዎን ኮምፒውተር ይመርጣሉ?", "Checking…": "በመፈተሽ ላይ…",
    "First time? Accept the invitation GitHub emailed you to join the organization, or the link won't open.": "የመጀመሪያ ጊዜ? ድርጅቱን ለመቀላቀል GitHub በኢሜይል የላከልዎትን ግብዣ ይቀበሉ፤ አለበለዚያ ሊንኩ አይከፈትም።",
    "Solve it in your own repository": "በራስዎ ማከማቻ ይፍቱት",
    "Sign in with GitHub to get your repository. You write your code there, and the grader checks every change.": "ማከማቻዎን ለማግኘት በGitHub ይግቡ። ኮድዎን እዚያ ይጽፋሉ፤ አራሚው እያንዳንዱን ለውጥ ይፈትሻል።",
    "Browse every challenge and its tests. To solve them, sign in with GitHub: you get your own repository, write your code there and push it, and the grader checks every push.": "ሁሉንም ተግዳሮቶችና ሙከራዎቻቸውን ይመልከቱ። ለመፍታት በGitHub ይግቡ፦ የራስዎን ማከማቻ ያገኛሉ፣ ኮድዎን እዚያ ጽፈው ይግፉታል፣ አራሚውም እያንዳንዱን ግፊት ይፈትሻል።",
    "Submit from GitHub": "ከGitHub ያስገቡ", "the grader runs these": "አራሚው እነዚህን ያሄዳል", "Not submitted yet.": "ገና አልገባም።",
    "Write your solution in your repository and push it. The grader checks every push, and the result appears here.": "መፍትሔዎን በማከማቻዎ ጽፈው ይግፉት። አራሚው እያንዳንዱን ግፊት ይፈትሻል፤ ውጤቱም እዚህ ይታያል።",
    "Fix the failing tests below and push again.": "ከታች ያሉትን ያልተሳኩ ሙከራዎች አስተካክለው እንደገና ይግፉ።",
    "Push again any time to save a new version.": "አዲስ ስሪት ለማስቀመጥ በማንኛውም ጊዜ እንደገና ይግፉ።",
    "Checking your latest push…": "የመጨረሻውን ግፊትዎን በመፈተሽ ላይ…", "How to push a new version": "አዲስ ስሪት እንዴት እንደሚገፋ",
    "Your saved solution": "የተቀመጠው መፍትሔዎ", "Open": "ይክፈቱ", "Write your solution, then commit and push to": "መፍትሔዎን ጽፈው commit አድርገው ይግፉ ወደ",
    "First time? Accept the invitation to the organization that GitHub emailed you.": "የመጀመሪያ ጊዜ? GitHub በኢሜይል የላከልዎትን የድርጅቱን ግብዣ ይቀበሉ።",
    "or on your computer after cloning.": "ወይም clone ካደረጉ በኋላ በኮምፒውተርዎ።", "Starter code": "የመነሻ ኮድ", "Not solved": "ያልተፈታ", "push to submit": "ለማስገባት ይግፉ",
    "Passed": "አልፏል", "The grader runs this test file with": "አራሚው ይህን የሙከራ ፋይል የሚያሄደው በ", "on every push.": "በእያንዳንዱ ግፊት።",
    "Your push passed and is saved:": "ግፊትዎ አልፏል፣ ተቀምጧል፦", "Your push did not pass yet:": "ግፊትዎ ገና አላለፈም፦",
    "Module finished. Submit it for review:": "ሞጁሉ ተጠናቋል። ለግምገማ ያስገቡት፦", "push to submit": "ለማስገባት ይግፉ",
    "Solved and saved from your repository ✓": "ተፈትቷል፣ ከማከማቻዎ ተቀምጧል ✓",
    "Tests run here for practice. Push to your repository to submit. Ctrl+Enter runs.": "ሙከራዎቹ እዚህ ለልምምድ ይሄዳሉ። ለማስገባት ወደ ማከማቻዎ ይግፉ። Ctrl+Enter ያሄዳል።",
    "Well done! Solved and saved from your repository.": "በጣም ጥሩ! ተፈትቷል፣ ከማከማቻዎ ተቀምጧል።",
    "Changed it since? Push again to save the new version.": "ከዚያ ወዲህ ቀይረውታል? አዲሱን ለማስቀመጥ እንደገና ይግፉ።",
    "Copy your code": "ኮድዎን ይቅዱ", "Copied": "ተቀድቷል", "Paste it into": "ኮዱን ይለጥፉ ወደ", "in your repository:": "በማከማቻዎ ውስጥ፦",
    "edit it on GitHub": "በGitHub ላይ ያርትዑ", ", or on your computer.": "፣ ወይም በኮምፒውተርዎ።", "Commit and push to": "Commit አድርገው ይግፉ ወደ",
    ". The grader checks it, and the result appears here and on your commit.": "። አራሚው ይፈትሸዋል፤ ውጤቱ እዚህና በcommitዎ ላይ ይታያል።",
    "Push": "ይግፉ", "from your GitHub repository to submit this module.": "ይህን ሞጁል ለማስገባት ከGitHub ማከማቻዎ።",
    "How to submit from GitHub": "ከGitHub እንዴት ማስገባት እንደሚቻል",
    "Solutions are submitted from your own GitHub repository,": "መፍትሔዎች የሚገቡት ከራስዎ የGitHub ማከማቻ ነው፦",
    ". The editor here is for practice.": "። እዚህ ያለው አርታኢ ለልምምድ ነው።",
    "Accept the invitation to the organization that GitHub emailed you (once).": "GitHub በኢሜይል የላከልዎትን የድርጅቱን ግብዣ ይቀበሉ (አንድ ጊዜ)።",
    "Edit": "ያርትዑ", ": on GitHub in the browser, or on your computer after cloning.": "፦ በአሳሹ በGitHub ላይ፣ ወይም clone ካደረጉ በኋላ በኮምፒውተርዎ።",
    ". Each push is graded; a pass counts toward your module.": "። እያንዳንዱ ግፊት ይታረማል፤ ያለፈ ለሞጁልዎ ይቆጠራል።",
    "Your code is not saved yet.": "ኮድዎ ገና አልተቀመጠም።", "to save it and count it toward your module.": "ለማስቀመጥና ለሞጁልዎ እንዲቆጠር።",
    "The grader is checking your solution. This takes a few seconds.": "አራሚው መፍትሔዎን እየፈተሸ ነው። ጥቂት ሰከንዶች ይወስዳል።",
    "Your solution passed here but was not saved.": "መፍትሔዎ እዚህ አልፏል ግን አልተቀመጠም።",
    "Well done! Solved and saved.": "በጣም ጥሩ! ተፈትቷል፣ ተቀምጧል።",
    "Not saved. Run the tests again to retry.": "አልተቀመጠም። እንደገና ለመሞከር ሙከራዎቹን ያሂዱ።",
    "Notifications": "ማሳወቂያዎች", "New review to write:": "የሚጻፍ አዲስ ግምገማ፦", "Due within 72 hours": "በ72 ሰዓት ውስጥ",
    "Reminder: review due within 24 hours:": "ማስታወሻ፦ ግምገማው በ24 ሰዓት ውስጥ ይጠበቃል፦",
    "72 hours passed, so this review moved to someone else:": "72 ሰዓት ስላለፈ ይህ ግምገማ ወደ ሌላ ሰው ተዛውሯል፦",
    "Your module was reviewed. Rate the review:": "ሞጁልዎ ተገምግሟል። ግምገማውን ይመዝኑ፦",
    "Your review was rated": "ግምገማዎ ደረጃ ተሰጥቶታል", "You reached a new reviewer level:": "አዲስ የገምጋሚ ደረጃ ላይ ደርሰዋል፦",
    "A Mentor added a second opinion:": "አማካሪ ሁለተኛ አስተያየት ጨምሯል፦", "Something changed.": "አንድ ነገር ተቀይሯል።",
    "Nothing yet. You'll hear here when you get a review to write, when your module is reviewed and when your reviews are rated.": "እስካሁን ምንም የለም። የሚጻፍ ግምገማ ሲደርስዎ፣ ሞጁልዎ ሲገመገም እና ግምገማዎችዎ ደረጃ ሲሰጣቸው እዚህ ይሰማሉ።",
    "You also get these on GitHub, by email or in the GitHub app, following your GitHub notification settings.": "እነዚህን በGitHub፣ በኢሜይል ወይም በGitHub መተግበሪያ፣ በGitHub የማሳወቂያ ቅንብሮችዎ መሠረት ያገኛሉ።",
    // navigation and chrome
    "Challenges": "ተግዳሮቶች", "Reviews": "ግምገማዎች", "Circle": "ክበብ", "Profile": "መገለጫ",
    "Timirtbet home": "የትምህርት ቤት መነሻ", "Choose a track": "ትራክ ይምረጡ", "Loading…": "በመጫን ላይ…",
    "Prototype · other learners and their ratings are simulated · your code stays in this browser": "ናሙና · ሌሎች ተማሪዎችና ደረጃዎቻቸው አስመሳይ ናቸው · ኮድዎ በዚህ አሳሽ ውስጥ ይቀራል",
    "Timirtbet · learn JavaScript and Go with your review circle": "ትምህርት ቤት · JavaScript እና Go ከግምገማ ክበብዎ ጋር ይማሩ",
    "Reset demo": "ናሙናውን ዳግም አስጀምር", "Clear everything on this device?": "በዚህ መሣሪያ ላይ ያለውን ሁሉ ይሰረዝ?", "Yes, reset": "አዎ፣ ዳግም አስጀምር",
    "Cancel": "ይቅር", "Copy": "ቅዳ", "Send": "ላክ", "Stay": "ቆይ",

    // tracks
    "The language of the web. Start with values and functions, then work up to closures, classes and async code.": "የድር ቋንቋ። በእሴቶችና ፋንክሽኖች ይጀምሩ፣ ከዚያ ወደ closures፣ classes እና async ኮድ ይሸጋገሩ።",
    "Fast, simple and built for servers. Learn types, slices and errors, then goroutines and channels.": "ፈጣን፣ ቀላል እና ለሰርቨሮች የተሠራ። ዓይነቶችን፣ slices እና ስህተቶችን ይማሩ፣ ከዚያ goroutines እና channels።",
    "basic": "መሰረታዊ", "advanced": "የላቀ", "points": "ነጥቦች", "Review solutions →": "መፍትሔዎችን ይገምግሙ →",
    "← All tracks": "← ሁሉም ትራኮች", "Difficulty": "ክብደት", "Status": "ሁኔታ",
    "All": "ሁሉም", "Easy": "ቀላል", "Medium": "መካከለኛ", "Hard": "ከባድ", "Any": "ማንኛውም", "Unsolved": "ያልተፈቱ", "Solved": "የተፈቱ",
    "Basic": "መሰረታዊ", "Advanced": "የላቀ", "No challenges match these filters.": "ከነዚህ ማጣሪያዎች ጋር የሚስማማ ተግዳሮት የለም።",

    // topics
    "Variables & Types": "ተለዋዋጮች እና ዓይነቶች", "Conditions": "ሁኔታዎች", "Loops": "ዑደቶች", "Functions": "ፋንክሽኖች",
    "Arrays": "ድርድሮች", "Objects": "ኦብጀክቶች", "Basic problem solving": "መሰረታዊ ችግር አፈታት", "Closures": "ክሎዠሮች",
    "Prototypes": "ፕሮቶታይፖች", "Array methods": "የድርድር ሜተዶች", "Async / Promises": "Async / Promises", "Event loop": "Event loop",
    "Error handling": "የስህተት አያያዝ", "Advanced problem solving": "የላቀ ችግር አፈታት", "Slices": "ስላይሶች", "Maps": "ማፖች",
    "Structs": "ስትራክቶች", "Pointers": "ፖይንተሮች", "Methods": "ሜተዶች", "Interfaces": "ኢንተርፌሶች", "Errors": "ስህተቶች",
    "Packages": "ፓኬጆች", "Goroutines": "ጎሩቲኖች", "Channels": "ቻናሎች", "Synchronization": "ማመሳሰል",

    // challenge titles
    "What type is it?": "ምን ዓይነት ነው?", "Letter grades": "የፊደል ውጤቶች", "Sum with a loop": "በዑደት ድምር",
    "Greet in three languages": "በሦስት ቋንቋዎች ሰላምታ", "Class average": "የክፍል አማካይ", "Count the words": "ቃላትን ቁጠር",
    "Palindrome check": "የፓሊንድሮም ማረጋገጫ", "Private counter": "የግል ቆጣሪ", "A chainable account": "የሚያያዝ ሂሳብ",
    "Shapes with prototypes": "ቅርጾች በፕሮቶታይፕ", "Top students": "ምርጥ ተማሪዎች", "Fetch in parallel": "በትይዩ ማምጣት",
    "Soon and later": "ቶሎ እና በኋላ", "Validate an age": "ዕድሜን አረጋግጥ", "LRU cache": "LRU ካሽ",
    "Temperatures and cents": "የሙቀት መጠን እና ሳንቲም", "Multiple returns and function values": "ብዙ መመለሻዎች እና የፋንክሽን እሴቶች",
    "Average and reverse": "አማካይ እና ገልባጭ", "Best student": "ምርጥ ተማሪ", "Palindromes in any script": "ፓሊንድሮሞች በማንኛውም ፊደል",
    "Swap and double": "መለዋወጥ እና ማባዛት", "Bank account methods": "የባንክ ሂሳብ ሜተዶች", "Shapes behind an interface": "ቅርጾች ከኢንተርፌስ ጀርባ",
    "Wrapped errors": "የተጠቀለሉ ስህተቶች", "Your own package": "የራስዎ ፓኬጅ", "Square in parallel": "በትይዩ ካሬ",
    "Generator and sum": "ጄኔሬተር እና ድምር", "A safe counter": "ደህንነቱ የተጠበቀ ቆጣሪ", "Top words": "በብዛት የተደጋገሙ ቃላት",

    // challenge statuses
    "Not tried": "ያልተሞከረ", "Rate the review": "ግምገማውን ይመዝኑ", "In review": "በግምገማ ላይ", "Passing locally": "እዚህ ያልፋል", "Passing": "ያልፋል",
    "Grading": "እየታረመ", "Reviewed": "ተገምግሟል", "Assigned": "ተመድቧል",

    // exercise page
    "Task": "ተግባር", "Tests": "ሙከራዎች", "run in your browser": "በአሳሽዎ ውስጥ ይሠራሉ", "Reset to starter": "ወደ መነሻው መልስ",
    "▶ Run tests": "▶ ሙከራዎችን አሂድ", "▶ Run checks": "▶ ፍተሻዎችን አሂድ", "Run tests": "ሙከራዎችን አሂድ", "Run checks": "ፍተሻዎችን አሂድ",
    "Submit for review": "ለግምገማ አስገባ", "Submitting…": "በማስገባት ላይ…", "Running…": "በማሄድ ላይ…", "Code editor": "የኮድ አርታኢ",
    "All passing. Ready to submit.": "ሁሉም አልፈዋል። ለማስገባት ዝግጁ።", "Pass every test to submit. Ctrl+Enter runs.": "ለማስገባት ሁሉንም ሙከራዎች ያልፉ። Ctrl+Enter ያሄዳል።",
    "No run yet.": "እስካሁን አልተሄደም።", "Code changed since this run": "ከዚህ ሙከራ በኋላ ኮዱ ተቀይሯል", "Your code is being read…": "ኮድዎ እየተነበበ ነው…",
    "Or push from your GitHub repository": "ወይም ከGitHub ማከማቻዎ push ያድርጉ", "Simulate a push with this code": "በዚህ ኮድ push አስመስል",
    "Review": "ግምገማ", "Review flow": "የግምገማ ሂደት", "Fold line": "መስመሩን አጣጥፍ", "Unfold line": "መስመሩን ዘርጋ",
    "The grader is running your code…": "አራሚው ኮድዎን እያሄደ ነው…", "Grading on the server…": "በሰርቨሩ ላይ እየታረመ…",
    "Review received. Rate it below.": "ግምገማ ደርሷል። ከታች ይመዝኑት።", "In review. You can keep practising.": "በግምገማ ላይ ነው። መለማመድዎን መቀጠል ይችላሉ።",
    "Guests can run every test. Sign in with GitHub to get your solutions reviewed.": "እንግዶች ሁሉንም ሙከራዎች ማሄድ ይችላሉ። መፍትሔዎችዎ እንዲገመገሙ በGitHub ይግቡ።",
    "When every test passes, submit. Since you're not in a circle, a reviewer comes from the wider pool.": "ሁሉም ሙከራዎች ሲያልፉ ያስገቡ። በክበብ ውስጥ ስለሌሉ ገምጋሚው ከሰፊው ቡድን ይመጣል።",
    "Waiting for someone who solved this challenge to be free": "ይህን ተግዳሮት የፈታ ሰው ነፃ እስኪሆን በመጠበቅ ላይ",
    "Passed. A review for this challenge is already in progress, so no new submission was made.": "አልፏል። ለዚህ ተግዳሮት ግምገማ አስቀድሞ ስላለ አዲስ ማስገባት አልተደረገም።",
    "Failed. On GitHub you'd see a red ✗ on the commit and, on a pull request, a comment listing what to fix.": "አላለፈም። በGitHub ላይ በcommit ላይ ቀይ ✗ ያያሉ፣ በpull request ላይ ደግሞ ምን እንደሚስተካከል የሚዘረዝር አስተያየት።",
    "Pushed. Webhook received, grader running…": "Push ተደርጓል። Webhook ደርሷል፣ አራሚው እየሠራ ነው…",
    "This page checks your code's structure right away. The grader runs the real test file below with": "ይህ ገጽ የኮድዎን አወቃቀር ወዲያውኑ ይፈትሻል። አራሚው ከታች ያለውን ትክክለኛ የሙከራ ፋይል በዚህ ያሄዳል፦",
    "when you submit or push.": "ሲያስገቡ ወይም push ሲያደርጉ።",
    "Timed out after 4 s. Check for a loop that never ends.": "ከ4 ሰከንድ በኋላ ጊዜው አልቋል። የማያልቅ ዑደት እንዳለ ያረጋግጡ።",
    "Not run": "አልተሄደም", "Runner error": "የአሂጅ ስህተት", "This browser blocked the test runner:": "ይህ አሳሽ የሙከራ አሂጁን ከልክሏል፦", "Syntax error:": "የአገባብ ስህተት፦",
    "Edit": "ያስተካክሉ", "in": "በ", "and push to": "እና push ያድርጉ ወደ",
    ". The same grader runs, and a pass goes to your circle just like Submit.": "። ያው አራሚ ይሠራል፣ ያለፈውም ልክ እንደ ማስገባት ወደ ክበብዎ ይሄዳል።",
    "and push. The same tests run, and a pass goes to your circle just like Submit.": "እና push ያድርጉ። ያው ሙከራዎች ይሠራሉ፣ ያለፈውም ልክ እንደ ማስገባት ወደ ክበብዎ ይሄዳል።",

    // review flow on the exercise page
    "2 · Automatic tests": "2 · ራስ-ሰር ሙከራዎች", "3 · Reviewer": "3 · ገምጋሚ", "4 · The review": "4 · ግምገማው",
    "5 · You rated it": "5 · የሰጡት ደረጃ", "6 · Their review score": "6 · የገምጋሚው ነጥብ", "7 · Their reputation": "7 · የገምጋሚው ዝና",
    "5 · How helpful was this review?": "5 · ይህ ግምገማ ምን ያህል ጠቃሚ ነበር?", "1 = not helpful · 5 = specific and useful": "1 = ጠቃሚ አይደለም · 5 = ግልጽና ጠቃሚ",
    "A circle member": "የክበብ አባል", "A Mentor's second opinion": "የአማካሪ ሁለተኛ አስተያየት",
    "Correctness": "ትክክለኛነት", "Readability": "ተነባቢነት", "Style": "አጻጻፍ", "Correctness:": "ትክክለኛነት፦", "Readability:": "ተነባቢነት፦", "Style:": "አጻጻፍ፦",
    "Needs work": "መሻሻል ያስፈልገዋል", "Good": "ጥሩ", "Excellent": "በጣም ጥሩ",
    "New": "አዲስ", "Helpful": "አጋዥ", "Trusted": "ታማኝ", "Mentor": "አማካሪ", "Top level": "ከፍተኛ ደረጃ", "Probation": "የሙከራ ጊዜ",

    // reviews page
    "Review code, earn reputation": "ኮድ ይገምግሙ፣ ዝና ያግኙ",
    "You can review a challenge once you've solved it. Circle members' code comes first. You don't see who wrote it, and they don't see who reviewed it.": "አንድን ተግዳሮት ከፈቱት በኋላ መገምገም ይችላሉ። የክበብ አባላት ኮድ ይቀድማል። ማን እንደጻፈው አያዩም፣ እነሱም ማን እንደገመገመ አያዩም።",
    "You review a challenge only after solving it. You don't see who wrote the code, and they don't see who reviewed it.": "አንድን ተግዳሮት የሚገመግሙት ከፈቱት በኋላ ብቻ ነው። ኮዱን ማን እንደጻፈው አያዩም፣ እነሱም ማን እንደገመገመ አያዩም።",
    "Your circle": "ክበብዎ", "Wider pool": "ሰፊው ቡድን", "Solve it first": "መጀመሪያ ይፍቱት", "from your circle": "ከክበብዎ",
    "Nothing waiting for you. Solve more challenges to review more of them.": "የሚጠብቅዎት ነገር የለም። ብዙ ለመገምገም ብዙ ተግዳሮቶችን ይፍቱ።",
    "Ratings your reviews got": "ግምገማዎችዎ ያገኟቸው ደረጃዎች", "No reviews yet.": "እስካሁን ግምገማ የለም።", "No rated reviews yet.": "እስካሁን ደረጃ የተሰጠው ግምገማ የለም።",
    "Your reviewer profile": "የገምጋሚ መገለጫዎ", "★ score": "★ ነጥብ", "review score": "የግምገማ ነጥብ", "Review score": "የግምገማ ነጥብ",
    "How scores and reputation work": "ነጥብና ዝና እንዴት እንደሚሠሩ",
    "is a weighted average of the stars your reviews get. Everyone starts at 3.5:": "ግምገማዎችዎ ያገኟቸው ኮከቦች ሚዛናዊ አማካይ ነው። ሁሉም በ3.5 ይጀምራል፦",
    "(5 × 3.5 + sum of stars) ÷ (5 + ratings)": "(5 × 3.5 + የኮከቦች ድምር) ÷ (5 + የደረጃዎች ብዛት)",
    "Points": "ነጥቦች", "per rated review: ★5 +10 · ★4 +6 · ★3 +2 · ★2 −3 · ★1 −6.": "ለእያንዳንዱ ደረጃ የተሰጠው ግምገማ፦ ★5 +10 · ★4 +6 · ★3 +2 · ★2 −3 · ★1 −6።",
    "Levels:": "ደረጃዎች፦", "New (0) → Helpful (30) → Trusted (100) → Mentor (250). Hard challenges go to Helpful reviewers and above first.": "አዲስ (0) → አጋዥ (30) → ታማኝ (100) → አማካሪ (250)። ከባድ ተግዳሮቶች መጀመሪያ ለአጋዥና ከዚያ በላይ ገምጋሚዎች ይሄዳሉ።",
    "Probation:": "የሙከራ ጊዜ፦", "4 or more ratings with a score under 3.0 pauses new reviews until it recovers.": "4 ወይም ከዚያ በላይ ደረጃዎች ከ3.0 በታች ነጥብ ካላቸው ነጥቡ እስኪሻሻል አዲስ ግምገማ ይቆማል።",
    "On probation: no new reviews until your score recovers above 3.0.": "በሙከራ ጊዜ ላይ፦ ነጥብዎ ከ3.0 በላይ እስኪመለስ አዲስ ግምገማ የለም።",
    "Second opinions (Mentors)": "ሁለተኛ አስተያየቶች (አማካሪዎች)", "Your second opinion": "የእርስዎ ሁለተኛ አስተያየት", "No flagged reviews.": "ምልክት የተደረገበት ግምገማ የለም።",
    "← Reviews": "← ግምገማዎች", "The solution": "መፍትሔው", "Your review": "የእርስዎ ግምገማ", "Your comment": "አስተያየትዎ", "Send review": "ግምገማ ላክ",
    "Review sent": "ግምገማ ተልኳል", "Waiting for the author to rate your review…": "ጸሐፊው ግምገማዎን እስኪመዝን በመጠበቅ ላይ…",
    "The author rated your review": "ጸሐፊው ግምገማዎን መዝኗል", "Back to reviews": "ወደ ግምገማዎች ተመለስ",
    "Name a line or identifier, like “line 3” or": "መስመር ወይም ስም ይጥቀሱ፣ ለምሳሌ “መስመር 3” ወይም",
    "Say why, not just what.": "ምን ብቻ ሳይሆን ለምን ይናገሩ።", "Suggest one change the author can make.": "ጸሐፊው ሊያደርገው የሚችል አንድ ለውጥ ይጠቁሙ።",
    "Point to a line, say what works, and suggest one change.": "መስመር ይጠቁሙ፣ የሚሠራውን ይናገሩ እና አንድ ለውጥ ይጠቁሙ።",
    "Sign in to review other learners' code and build a reviewer reputation.": "የሌሎች ተማሪዎችን ኮድ ለመገምገምና የገምጋሚ ዝና ለመገንባት ይግቡ።",

    // circle
    "Review circle": "የግምገማ ክበብ", "Open circle": "ክበቡን ክፈት", "Find a circle": "ክበብ ፈልግ", "Find your circle": "ክበብዎን ያግኙ",
    "You're not in a circle, so reviews come from the wider pool. Join friends with an invite code, or start your own.": "በክበብ ውስጥ ስለሌሉ ግምገማዎች ከሰፊው ቡድን ይመጣሉ። በግብዣ ኮድ ከጓደኞችዎ ጋር ይቀላቀሉ ወይም የራስዎን ይጀምሩ።",
    "A circle is up to 8 learners who review each other first. Start one and share the invite code, or join friends with theirs.": "ክበብ እስከ 8 የሚደርሱ፣ መጀመሪያ እርስ በርስ የሚገመገሙ ተማሪዎች ነው። አንድ ይጀምሩና የግብዣ ኮዱን ያጋሩ፣ ወይም በጓደኞችዎ ኮድ ይቀላቀሉ።",
    "Invite code": "የግብዣ ኮድ", "New code": "አዲስ ኮድ", "Join with a code": "በኮድ ይቀላቀሉ", "Join circle": "ክበቡን ተቀላቀል",
    "Start a circle": "ክበብ ይጀምሩ", "Circle name": "የክበብ ስም", "Language": "ቋንቋ", "JavaScript and Go": "JavaScript እና Go", "Create circle": "ክበብ ፍጠር",
    "Leaderboard": "የደረጃ ሰንጠረዥ", "Learner": "ተማሪ", "Level": "ደረጃ", "(you)": "(እርስዎ)", "Activity": "እንቅስቃሴ",
    "Leave this circle": "ከዚህ ክበብ ውጣ", "Leave circle": "ከክበቡ ውጣ", "Sign in to join a review circle.": "የግምገማ ክበብ ለመቀላቀል ይግቡ።",
    "No circle has that invite code. Check it with whoever shared it.": "ያ የግብዣ ኮድ ያለው ክበብ የለም። ካጋራው ሰው ጋር ያረጋግጡ።",
    "Give the circle a name of at least 3 characters.": "ለክበቡ ቢያንስ 3 ፊደላት ያለው ስም ይስጡ።", "Demo: try K7QX2MPA": "ናሙና፦ K7QX2MPA ይሞክሩ",
    "rated a review ★5": "አንድ ግምገማ ★5 መዘነ", "joined the circle": "ክበቡን ተቀላቀለ", "started the circle": "ክበቡን ጀመረ",

    // progress, profile, account
    "Your progress": "የእርስዎ እድገት", "solved": "የተፈቱ", "Practising as a guest": "እንደ እንግዳ እየተለማመዱ ነው",
    "Every challenge and its tests work without an account; your code stays in this browser. Sign in with GitHub to submit for review and join a circle.": "ሁሉም ተግዳሮቶችና ሙከራዎቻቸው ያለ መለያ ይሠራሉ፤ ኮድዎ በዚህ አሳሽ ውስጥ ይቀራል። ለግምገማ ለማስገባትና ክበብ ለመቀላቀል በGitHub ይግቡ።",
    "How review works": "ግምገማ እንዴት እንደሚሠራ", "You submit": "እርስዎ ያስገባሉ", "Automatic tests": "ራስ-ሰር ሙከራዎች",
    "A circle member gets it": "የክበብ አባል ይቀበለዋል", "They review it": "እሱ/እሷ ይገመግሙታል", "You rate the review ★1–5": "ግምገማውን ★1–5 ይመዝናሉ",
    "Their review score updates": "የገምጋሚው ነጥብ ይዘመናል", "Their reputation grows": "የገምጋሚው ዝና ያድጋል",
    "Reviewers must have solved the challenge themselves. Reviews are anonymous both ways.": "ገምጋሚዎች ተግዳሮቱን ራሳቸው የፈቱ መሆን አለባቸው። ግምገማዎች በሁለቱም በኩል ማንነት የማይገለጽባቸው ናቸው።",
    "Demo account": "የናሙና መለያ", "Challenges solved": "የተፈቱ ተግዳሮቶች", "Your repository": "ማከማቻዎ",
    "What Timirtbet stores about you": "ትምህርት ቤት ስለ እርስዎ የሚያስቀምጠው", "GitHub id and username": "የGitHub መለያ ቁጥርና የተጠቃሚ ስም",
    "stored": "ይቀመጣል", "Your code, test results, reviews and ratings": "ኮድዎ፣ የሙከራ ውጤቶች፣ ግምገማዎችና ደረጃዎች",
    "Name, email, phone, age, school, location": "ስም፣ ኢሜይል፣ ስልክ፣ ዕድሜ፣ ትምህርት ቤት፣ አድራሻ", "never asked": "በፍጹም አይጠየቅም",
    "Passwords": "የይለፍ ቃሎች", "none exist": "የሉም", "Sign out": "ውጣ", "Sign out on every device?": "ከሁሉም መሣሪያዎች ይውጡ?",
    "Signed in with GitHub": "በGitHub ገብተዋል", "Your data": "የእርስዎ መረጃ", "Export my data": "መረጃዬን አውርድ", "Delete my account": "መለያዬን ሰርዝ",
    "Delete my account: type": "መለያዬን ሰርዝ፦ ለማረጋገጥ", "to confirm. This removes your data and your repository.": "ብለው ይጻፉ። ይህ መረጃዎንና ማከማቻዎን ያስወግዳል።",
    "Accept the invitation to the Timirtbet organization that GitHub emailed you, then push to": "GitHub በኢሜይል የላከልዎትን የTimirtbet ድርጅት ግብዣ ይቀበሉ፣ ከዚያ push ያድርጉ ወደ",
    "Your repository is being set up. Sign out and in again if it doesn't appear.": "ማከማቻዎ እየተዘጋጀ ነው። ካልታየ ወጥተው እንደገና ይግቡ።",
    "Timirtbet stores your GitHub id and username, your repository": "ትምህርት ቤት የGitHub መለያ ቁጥርዎንና የተጠቃሚ ስምዎን፣ ማከማቻዎን",
    ", the code you submit, your reviews and your circle. Nothing else. It is stored on Google Cloud in the United States. You can export or delete it from your profile at any time.": "፣ የሚያስገቡትን ኮድ፣ ግምገማዎችዎንና ክበብዎን ያስቀምጣል። ሌላ ምንም። መረጃው በአሜሪካ በGoogle Cloud ላይ ይቀመጣል። በማንኛውም ጊዜ ከመገለጫዎ ማውረድ ወይም መሰረዝ ይችላሉ።",

    // sign in
    "Sign in": "ግባ", "Sign in with GitHub": "በGitHub ይግቡ", "Continue with GitHub": "በGitHub ይቀጥሉ", "GitHub username": "የGitHub ተጠቃሚ ስም",
    "No sign-up form. Timirtbet asks GitHub for no permissions, so all it learns is your public username. On your first sign-in you're added to the Timirtbet organization and get your own private repository for pushing solutions.": "የምዝገባ ቅጽ የለም። ትምህርት ቤት ከGitHub ምንም ፈቃድ አይጠይቅም፤ የሚያውቀው ይፋዊ የተጠቃሚ ስምዎን ብቻ ነው። ለመጀመሪያ ጊዜ ሲገቡ ወደ Timirtbet ድርጅት ይታከላሉ፣ መፍትሔዎችን push የሚያደርጉበት የግል ማከማቻም ያገኛሉ።",
    "No sign-up form. Timirtbet asks GitHub for no permissions, so all it learns is your public username. On your first sign-in you join the Timirtbet organization and get your own private repository for pushing solutions.": "የምዝገባ ቅጽ የለም። ትምህርት ቤት ከGitHub ምንም ፈቃድ አይጠይቅም፤ የሚያውቀው ይፋዊ የተጠቃሚ ስምዎን ብቻ ነው። ለመጀመሪያ ጊዜ ሲገቡ Timirtbet ድርጅትን ይቀላቀላሉ፣ መፍትሔዎችን push የሚያደርጉበት የግል ማከማቻም ያገኛሉ።",
    "(prototype: the real app sends you to GitHub instead)": "(ናሙና፦ ትክክለኛው መተግበሪያ ወደ GitHub ይልክዎታል)",
    "Or keep practising as a guest: every challenge and its tests work without an account.": "ወይም እንደ እንግዳ መለማመድዎን ይቀጥሉ፦ ሁሉም ተግዳሮቶችና ሙከራዎቻቸው ያለ መለያ ይሠራሉ።",
    "your-username": "የተጠቃሚ-ስምዎ",
    "That isn't a valid GitHub username: letters, digits and single hyphens, up to 39 characters.": "ያ ትክክለኛ የGitHub ተጠቃሚ ስም አይደለም፦ ፊደላት፣ ቁጥሮችና ነጠላ ሰረዞች፣ እስከ 39 ቁምፊዎች።",
    "Sign-in expired or was started elsewhere. Please try again.": "መግቢያው ጊዜው አልፏል ወይም በሌላ ቦታ ተጀምሯል። እባክዎ እንደገና ይሞክሩ።",
    // modules
    "Module review": "የሞጁል ግምገማ", "Ready to submit": "ለማስገባት ዝግጁ", "Sign in to save progress": "እድገትዎን ለማስቀመጥ ይግቡ",
    "Your code stays in this browser. Sign in to save progress. Ctrl+Enter runs.": "ኮድዎ በዚህ አሳሽ ውስጥ ይቀራል። እድገትዎን ለማስቀመጥ ይግቡ። Ctrl+Enter ያሄዳል።",
    "Checking your solution on the grader…": "መፍትሔዎ በአራሚው እየተፈተሸ ነው…", "The grader found a problem. Fix it and run again.": "አራሚው ችግር አግኝቷል። ያስተካክሉና እንደገና ያሂዱ።",
    "Saved to your progress ✓": "በእድገትዎ ተቀምጧል ✓", "Solved. Run the tests to save this version instead.": "ተፈቷል። ይህን ስሪት ለማስቀመጥ ሙከራዎቹን ያሂዱ።",
    "When every test passes, your solution is saved automatically. Ctrl+Enter runs.": "ሁሉም ሙከራዎች ሲያልፉ መፍትሔዎ በራሱ ይቀመጣል። Ctrl+Enter ያሄዳል።", "The review": "ግምገማው", "You rated it": "የሰጡት ደረጃ", "How helpful was this review?": "ይህ ግምገማ ምን ያህል ጠቃሚ ነበር?",
    "Their review score": "የገምጋሚው ነጥብ", "Their reputation": "የገምጋሚው ዝና", "How module review works": "የሞጁል ግምገማ እንዴት እንደሚሠራ",
    "Solve each challenge and submit it to the grader": "እያንዳንዱን ተግዳሮት ፈትተው ለአራሚው ያስገቡ",
    "Every pass counts and earns points": "ያለፈ ሁሉ ይቆጠራል፣ ነጥብም ያስገኛል",
    "When all challenges in a module pass, submit the module": "በሞጁሉ ያሉ ሁሉም ተግዳሮቶች ሲያልፉ ሞጁሉን ያስገቡ",
    "Someone who finished that module reviews all of it": "ያንን ሞጁል የጨረሰ ሰው ሙሉውን ይገመግመዋል",
    "Reviewers must have finished the same module. Reviews are anonymous both ways.": "ገምጋሚዎች ያንኑ ሞጁል የጨረሱ መሆን አለባቸው። ግምገማዎች በሁለቱም በኩል ማንነት የማይገለጽባቸው ናቸው።",
    "Submit": "አስገባ", "Submit module for review": "ሞጁሉን ለግምገማ አስገባ", "Submit again for a new review": "ለአዲስ ግምገማ እንደገና አስገባ",
    "Review received": "ግምገማ ደርሷል", "Rate it below.": "ከታች ይመዝኑት።", "See the review": "ግምገማውን ይመልከቱ",
    "Waiting for someone who finished this module to be free": "ይህን ሞጁል የጨረሰ ሰው ነፃ እስኪሆን በመጠበቅ ላይ",
    "A reviewer is reading your solutions": "ገምጋሚው መፍትሔዎችዎን እያነበበ ነው",
    "Every passed challenge counts. Sign in with GitHub to submit a finished module for review.": "ያለፈ ተግዳሮት ሁሉ ይቆጠራል። የተጠናቀቀ ሞጁልን ለግምገማ ለማስገባት በGitHub ይግቡ።",
    "Module review runs on the live site: each passed challenge counts, and the whole module goes to one reviewer.": "የሞጁል ግምገማ በቀጥታው ድረ-ገጽ ላይ ይሠራል፦ ያለፈ ተግዳሮት ሁሉ ይቆጠራል፣ ሙሉው ሞጁል ወደ አንድ ገምጋሚ ይሄዳል።",
    "Passed on the grader.": "በአራሚው አልፏል።", "Passed on the grader. Submit again to replace the saved solution.": "በአራሚው አልፏል። የተቀመጠውን መፍትሔ ለመተካት እንደገና ያስገቡ።",
    "All passing. Submit to the grader to count it.": "ሁሉም አልፈዋል። እንዲቆጠር ለአራሚው ያስገቡ።",
    "Tasks": "ተግባሮች", "Name the challenge and line, say what works, and suggest one change.": "ተግዳሮቱንና መስመሩን ይጥቀሱ፣ የሚሠራውን ይናገሩ እና አንድ ለውጥ ይጠቁሙ።",
    "You review a module only after finishing it yourself. You don't see who wrote the code, and they don't see who reviewed it.": "ሞጁልን የሚገመግሙት ራስዎ ከጨረሱት በኋላ ብቻ ነው። ኮዱን ማን እንደጻፈው አያዩም፣ እነሱም ማን እንደገመገመ አያዩም።",
    "due within 72 h": "በ72 ሰዓት ውስጥ", "grading…": "እየታረመ…",
    "Basics 1: values and control flow": "መሰረታዊ 1፦ እሴቶችና የፍሰት ቁጥጥር", "Basics 2: working with data": "መሰረታዊ 2፦ ከዳታ ጋር መሥራት",
    "Advanced 1: functions and objects": "የላቀ 1፦ ፋንክሽኖችና ኦብጀክቶች", "Advanced 2: async and robust code": "የላቀ 2፦ Async እና ጠንካራ ኮድ",
    "Advanced 1: types and packages": "የላቀ 1፦ ዓይነቶችና ፓኬጆች", "Advanced 2: concurrency": "የላቀ 2፦ ትይዩ አሠራር",
  };

  const S = (s) => AM[s] || s;
  // Dynamic text: [pattern, replacement]; replacements may call S() on captured parts.
  const PAT = [
    [/^(\d+) challenges$/, (m, n) => `${n} ተግዳሮቶች`],
    [/^(JavaScript|Go): (\d+) challenges$/, (m, l, n) => `${l}፦ ${n} ተግዳሮቶች`],
    [/^← (JavaScript|Go) challenges$/, (m, l) => `← የ${l} ተግዳሮቶች`],
    [/^Run the tests once more on (.+) to save (those solutions|that solution) for review\.$/, (m, t, w) => `ለግምገማ ${w === "those solutions" ? "እነዚያን መፍትሔዎች" : "ያንን መፍትሔ"} ለማስቀመጥ ሙከራዎቹን በ${t} ላይ አንድ ጊዜ እንደገና ያሂዱ።`],
    [/^Module (\d+)$/, (m, n) => `ሞጁል ${n}`],
    [/^(\d+)\/(\d+) passed$/, (m, a, b) => `${a}/${b} አልፈዋል`],
    [/^All (\d+) passed\.$/, (m, n) => `ሁሉም ${n} አልፈዋል።`],
    [/^Pass all (\d+) challenges on the grader to submit this module for review\.$/, (m, n) => `ይህን ሞጁል ለግምገማ ለማስገባት ሁሉንም ${n} ተግዳሮቶች በአራሚው ያልፉ።`],
    [/^assigned (.+)$/, (m, t) => `የተመደበው ${S(t)}`],
    [/^\+(\d+) more$/, (m, n) => `+${n} ተጨማሪ`],
    [/^Start (JavaScript|Go) →$/, (m, l) => `${l} ይጀምሩ →`],
    [/^Continue · (\d+\/\d+) →$/, (m, n) => `ይቀጥሉ · ${n} →`],
    [/^(\d+) of (\d+) points$/, (m, a, b) => `${a} ከ${b} ነጥቦች`],
    [/^(\d+) members · reviews go here first$/, (m, n) => `${n} አባላት · ግምገማዎች መጀመሪያ እዚህ ይሄዳሉ`],
    [/^(\d+) to review$/, (m, n) => `${n} የሚገመገሙ`],
    [/^(\d+\/\d+) solved$/, (m, n) => `${n} ተፈተዋል`],
    [/^(\d+) pts$/, (m, n) => `${n} ነጥብ`],
    [/^pts \(([+−-]?\d+)\)$/, (m, n) => `ነጥብ (${n})`],
    [/^(\d+) \/ (\d+) tests passed$/, (m, a, b) => `${a} / ${b} ሙከራዎች አልፈዋል`],
    [/^(\d+) \/ (\d+) passed$/, (m, a, b) => `${a} / ${b} አልፈዋል`],
    [/^(\d+) \/ 40 characters minimum$/, (m, n) => `${n} / 40 ቁምፊዎች ቢያንስ`],
    [/^Reviewed ★(\d)$/, (m, n) => `ተገምግሟል ★${n}`],
    [/^(\d+) rated reviews?$/, (m, n) => `${n} ደረጃ የተሰጣቸው ግምገማዎች`],
    [/^(\d+) to (Helpful|Trusted|Mentor)$/, (m, n, l) => `${S(l)} ለመሆን ${n}`],
    [/^Reputation · (.+)$/, (m, l) => `ዝና · ${S(l)}`],
    [/^(\d+) h ago$/, (m, n) => `ከ${n} ሰዓት በፊት`],
    [/^(\d+) d ago$/, (m, n) => `ከ${n} ቀን በፊት`],
    [/^(\d+) min ago$/, (m, n) => `ከ${n} ደቂቃ በፊት`],
    [/^just now$/, () => "አሁን"],
    [/^Open (solution\.(?:js|go)) on GitHub ↗$/, (m, f) => `${f}ን በGitHub ይክፈቱ ↗`],
    [/^(\d+) of (\d+) tests passed$/, (m, a, b) => `ከ${b} ሙከራዎች ${a} አልፈዋል`],
    [/^Your last push, (.+)\. Fix these and push again:$/, (m, t) => `የመጨረሻው ግፊትዎ፣ ${tr(t) || t}። እነዚህን አስተካክለው እንደገና ይግፉ፦`],
    [/^run with$/, () => "የሚሄደው በ"],
    [/^Your latest push passed (\d+) of (\d+) tests\.$/, (m, a, b) => `የመጨረሻው ግፊትዎ ከ${b} ሙከራዎች ${a}ቱን አልፏል።`],
    [/^Pushed (.+)$/, (m, t) => `የተገፋው ${S(t)}`],
    [/^in your repository:$/, () => "በማከማቻዎ ውስጥ፦"],
    [/^All (\d+) (tests|checks) pass here\. Now submit it from GitHub\.$/, (m, n, k) => `ሁሉም ${n} ${k === "tests" ? "ሙከራዎች" : "ፍተሻዎች"} እዚህ አልፈዋል። አሁን ከGitHub ያስገቡት።`],
    [/^Push all (\d+) challenges from your GitHub repository to submit this module for review\.$/, (m, n) => `ይህን ሞጁል ለግምገማ ለማስገባት ሁሉንም ${n} ተግዳሮቶች ከGitHub ማከማቻዎ ይግፉ።`],
    [/^Push "(.+)" from your GitHub repository first: only pushed solutions are submitted\.$/, (m, t) => `መጀመሪያ "${S(t)}"ን ከGitHub ማከማቻዎ ይግፉ፦ የሚገቡት የተገፉ መፍትሔዎች ብቻ ናቸው።`],
    [/^All (\d+) (tests|checks) pass in your browser\.$/, (m, n, k) => `ሁሉም ${n} ${k === "tests" ? "ሙከራዎች" : "ፍተሻዎች"} በአሳሽዎ አልፈዋል።`],
    [/^All (\d+) (tests|checks) pass here\. Saving…$/, (m, n, k) => `ሁሉም ${n} ${k === "tests" ? "ሙከራዎች" : "ፍተሻዎች"} እዚህ አልፈዋል። በማስቀመጥ ላይ…`],
    [/^(.*?) ?Run the tests again to retry\.$/, (m, e) => `${e === "No connection to Timirtbet." ? "ከትምህርት ቤት ጋር ግንኙነት የለም።" : e === "The grader took too long." ? "አራሚው በጣም ዘገየ።" : e} እንደገና ለመሞከር ሙከራዎቹን ያሂዱ።`],
    [/^Module (\d+): (\d+) of (\d+) done\.$/, (m, n, a, b) => `ሞጁል ${n}፦ ${a} ከ${b} ተጠናቀዋል።`],
    [/^Module (\d+): all (\d+) done\.$/, (m, n, b) => `ሞጁል ${n}፦ ሁሉም ${b} ተጠናቀዋል።`],
    [/^That completes Module (\d+)\.$/, (m, n) => `ይህ ሞጁል ${n}ን ያጠናቅቃል።`],
    [/^Next: (.+) →$/, (m, t) => `ቀጣይ፦ ${S(t)} →`],
    [/^([+−-]\d+) pts$/, (m, n) => `${n} ነጥብ`],
    [/^Notifications, (\d+) unread$/, (m, n) => `ማሳወቂያዎች፣ ${n} ያልተነበቡ`],
    [/^Review: Module (\d+) · (.+)$/, (m, n, t) => `ግምገማ፦ ሞጁል ${n} · ${S(t)}`],
    [/^solved (.+)$/, (m, t) => `${S(t)}ን ፈታ`],
    [/^reviewed your (.+)$/, (m, t) => `የእርስዎን ${S(t)} ገመገመ`],
    [/^Review: (.+)$/, (m, t) => `ግምገማ፦ ${S(t)}`],
    [/^(\d+) of 8 members\. Your submissions go to a member here first; the wider pool steps in only when nobody here who solved the challenge is free\.$/,
      (m, n) => `ከ8 አባላት ${n}። ያስገቡት መጀመሪያ እዚህ ላለ አባል ይሄዳል፤ ተግዳሮቱን የፈታ ነፃ አባል እዚህ ከሌለ ብቻ ሰፊው ቡድን ይገባል።`],
    [/^Leave (.+)\? Your reviews will come from the wider pool\.$/, (m, c) => `ከ${c} ይውጡ? ግምገማዎችዎ ከሰፊው ቡድን ይመጣሉ።`],
    [/^When every test passes, submit\. Someone in (.+) who solved this challenge reviews it, and you rate their review\.$/,
      (m, c) => `ሁሉም ሙከራዎች ሲያልፉ ያስገቡ። ይህን ተግዳሮት የፈታ የ${c} አባል ይገመግመዋል፣ እርስዎም ግምገማውን ይመዝናሉ።`],
    [/^review rated ★1$/, () => "★1 የተሰጠው ግምገማ"],
  ];

  function tr(s) {
    if (AM[s]) return AM[s];
    for (const [re, fn] of PAT) if (re.test(s)) return s.replace(re, fn);
    if (s.includes(" · ")) { // "Loops · Basic", "JavaScript · Loops · from your circle"
      const parts = s.split(" · "), out = parts.map((p) => tr(p) || p);
      if (out.some((p, i) => p !== parts[i])) return out.join(" · ");
    }
    if (/^· /.test(s)) { const t = tr(s.slice(2)); if (t) return "· " + t; }
    if (/ ·$/.test(s)) { const t = tr(s.slice(0, -2)); if (t) return t + " ·"; }
    return null;
  }

  const SKIP = "pre,code,textarea,script,style,.cm-editor,.track-code,.mono.hash,[data-i18n-skip]";
  const ATTRS = ["placeholder", "aria-label", "title"], SKIP_ATTR = "pre,code,script,style,.cm-editor,[data-i18n-skip]";
  let lang = "en";
  try { lang = localStorage.getItem("timirtbet.lang") || ((navigator.language || "").toLowerCase().startsWith("am") ? "am" : "en"); } catch (e) {}

  function textNode(n) {
    const el = n.parentElement; if (!el || el.closest(SKIP)) return;
    const en = n.__en != null ? n.__en : n.data;
    if (lang === "am") {
      const key = en.replace(/\s+/g, " ").trim(); if (!key || !/[A-Za-z]/.test(key)) return;
      const t = tr(key); if (t == null) return;
      n.__en = en; const lead = en.match(/^\s*/)[0], tail = en.match(/\s*$/)[0];
      if (n.data !== lead + t + tail) n.data = lead + t + tail;
    } else if (n.__en != null) { n.data = n.__en; n.__en = null; }
  }
  function element(el) {
    if (el.closest(SKIP_ATTR)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      el.__enA = el.__enA || {};
      const en = el.__enA[a] != null ? el.__enA[a] : el.getAttribute(a);
      if (lang === "am") { const t = tr(en.trim()); if (t != null) { el.__enA[a] = en; el.setAttribute(a, t); } }
      else if (el.__enA[a] != null) { el.setAttribute(a, el.__enA[a]); delete el.__enA[a]; }
    }
  }
  function apply(root) {
    if (!root) return;
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1) return;
    element(root);
    root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(element);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) textNode(n);
  }
  function set(l) {
    lang = l === "am" ? "am" : "en";
    try { localStorage.setItem("timirtbet.lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.title = lang === "am" ? "ትምህርት ቤት | Timirtbet" : "Timirtbet | ትምህርት ቤት";
    const b = document.getElementById("langBtn");
    if (b) { b.textContent = lang === "am" ? "EN" : "አማ"; b.setAttribute("aria-label", lang === "am" ? "Switch to English" : "ወደ አማርኛ ቀይር"); }
    apply(document.body);
  }
  function start() {
    const tools = document.querySelector(".top-in");
    if (tools && !document.getElementById("langBtn")) {
      const b = document.createElement("button");
      b.id = "langBtn"; b.className = "lang-btn"; b.setAttribute("data-i18n-skip", "");
      b.addEventListener("click", () => set(lang === "am" ? "en" : "am"));
      tools.insertBefore(b, document.getElementById("who"));
    }
    new MutationObserver((ms) => { if (lang !== "am") return; for (const m of ms) m.addedNodes.forEach(apply); })
      .observe(document.body, { childList: true, subtree: true });
    set(lang);
  }
  return { start, set, tr, get lang() { return lang; } };
})();
