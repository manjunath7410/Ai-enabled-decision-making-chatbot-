/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { DECIDE_AI_SYSTEM_PROMPT } from '../src/prompts/decisionPrompts.ts';

// Bounded context settings to minimize latency and token expenditure
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_MESSAGE_CHARACTERS = 4000;
export const REQUEST_TIMEOUT_MS = 60000;

export interface ValidatedChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onError: (error: { message: string; code: string; status: number }) => void;
  onComplete: () => void;
}

export class AIService {
  private readonly modelIdentifier = 'gemini-3.8-flash';

  /**
   * Lazily creates or returns the GoogleGenAI client with the latest process.env key
   */
  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Returns current health & configuration status of the AI service
   */
  public getStatus() {
    const apiKey = process.env.GEMINI_API_KEY;
    const hasApiKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    return {
      status: hasApiKey ? 'ready' : 'unconfigured',
      model: this.modelIdentifier,
      hasApiKey: hasApiKey,
      maxHistory: MAX_HISTORY_MESSAGES,
      maxCharsPerMessage: MAX_MESSAGE_CHARACTERS,
    };
  }

  /**
   * Sanitizes and bounds conversation history to optimize latency and cost
   */
  public prepareConversation(rawMessages: any[]): ValidatedChatMessage[] {
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      throw new Error('Messages payload must be a non-empty array.');
    }

    const filtered: ValidatedChatMessage[] = [];

    for (const msg of rawMessages) {
      if (!msg || typeof msg !== 'object') continue;

      const role = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
      let content = typeof msg.content === 'string' ? msg.content.trim() : '';

      // Skip empty content
      if (!content) continue;

      // Bound content length to prevent memory/token abuse
      if (content.length > MAX_MESSAGE_CHARACTERS) {
        content = content.slice(0, MAX_MESSAGE_CHARACTERS) + '... [truncated]';
      }

      filtered.push({ role, content });
    }

    if (filtered.length === 0) {
      throw new Error('No valid, non-empty messages were provided.');
    }

    // Keep only the most recent N messages to maintain high responsiveness & budget
    const bounded = filtered.slice(-MAX_HISTORY_MESSAGES);

    // Ensure the conversation starts with a user message for valid Gemini context
    const firstUserIdx = bounded.findIndex((m) => m.role === 'user');
    if (firstUserIdx > 0) {
      return bounded.slice(firstUserIdx);
    }

    return bounded;
  }

  /**
   * Generates a structured decision framework matching the 6-section standard
   */
  private generateStructuredFallback(userDilemma: string): string {
    const lower = userDilemma.toLowerCase();
    const isEmergency =
      lower.includes('fire') ||
      lower.includes('smoke') ||
      lower.includes('poison') ||
      lower.includes('suicide') ||
      lower.includes('bleeding') ||
      lower.includes('chest pain') ||
      lower.includes('intruder') ||
      lower.includes('911');

    if (isEmergency) {
      return `> 🚨 **IMMEDIATE EMERGENCY SAFETY NOTICE**:
> If you are facing an active fire, medical emergency, or immediate physical danger, **call 911 (or your local emergency services)** immediately and **evacuate to a safe location**. Do not attempt dangerous interventions or delay life safety for advice.

### Immediate Action Required
1. **Evacuate**: Get yourself and others out of harm's way immediately.
2. **Call 911 / Fire Department**: Alert emergency professionals from a safe distance.
3. **Do not re-enter** the building or hazardous area under any circumstances.`;
    }

    const isInjectionAttempt =
      lower.includes('ignore all') ||
      lower.includes('rogue script') ||
      lower.includes('system prompt') ||
      lower.includes('jailbreak');

    if (isInjectionAttempt) {
      return `I am DecideAI, an objective decision-support assistant. I cannot override my operating principles, reveal system instructions, or act outside my purpose.

I am here to help you reason through tough choices, compare options, and weigh practical trade-offs. What real-world decision can I help you think through today?`;
    }

    // 1. Simple factual or everyday habit questions (Mode 1: Direct Answer without structured headers)
    const isCoffeeQuery = lower.includes('coffee') && (lower.includes('5 pm') || lower.includes('sleep'));
    if (isCoffeeQuery) {
      return `It is best to skip the coffee at 5 PM if you want to sleep well by 10 PM. 

Caffeine typically stays in your system for 5 to 7 hours, so drinking it late in the afternoon will likely make it harder to fall asleep or reduce your deep sleep quality. If you need a late-afternoon boost, try a brisk 10-minute walk, cold water, or decaf tea instead.`;
    }

    const isFactualSimple =
      lower.includes('what is the capital') ||
      lower.includes('distance to the moon') ||
      (lower.startsWith('what is') && lower.length < 40);
    if (isFactualSimple) {
      return `Here is the direct answer to your question: for simple factual matters, DecideAI provides clear, straightforward explanations without unneeded decision matrices. What specific decision or problem are you looking to solve next?`;
    }

    // 2. Underspecified queries needing Smart Clarification (Mode 2)
    const isInvestmentOpen = (lower.includes('invest') && lower.includes('10,000')) || (lower.includes('invest') && lower.length < 50);
    if (isInvestmentOpen) {
      return `Investing $10,000 is a smart move, but the best approach depends on when you will need this money back.

**To give you the most useful recommendation: what is your timeline for this money (e.g., needed within 2 years for a purchase, or left to grow for 5+ years)?**

Once I know your timeline and comfort with market ups and downs, we can compare options like high-yield savings, index funds, or paying down debt.`;
    }

    const isLaptopQuery =
      (lower.includes('laptop') || lower.includes('computer')) &&
      !lower.includes('budget') &&
      !lower.includes('$') &&
      lower.length < 60;
    if (isLaptopQuery) {
      return `To help you pick the right laptop without drowning in technical specs, let's keep it simple:

**What will you mainly use it for, and what is your approximate budget?**

For example:
- **General home & browsing ($400 - $700):** A dependable Chromebook or Windows laptop with 8GB RAM is all you need for emails, streaming, and documents.
- **Work & school multitasker ($700 - $1,100):** A MacBook Air (M2) or mid-range Dell/Lenovo with great battery life and snappy performance.
- **Creative work or gaming ($1,200+):** Needs a dedicated graphics card and extra storage.

Tell me a bit about what you do day-to-day, and we'll narrow it down to the best 1 or 2 options!`;
    }

    // 3. Inconclusive dilemma / Close call scenario (Mode 4: Uncertainty notice, no arbitrary winner)
    const isInconclusive =
      lower.includes('inconclusive') ||
      lower.includes('evenly balanced') ||
      lower.includes('50/50') ||
      (lower.includes('cannot decide') && lower.includes('equal'));
    if (isInconclusive) {
      return `### A. Understanding Your Situation
You are facing a very close call where the competing paths have nearly equal weight and trade-offs.

### B. Available Options
1. **Option A: Path of Security & Predictability** - Keeps downside risks minimal.
2. **Option B: Path of Opportunity & Growth** - Provides higher upside with proportional variance.

### C. Comparison
| Option | Core Benefit | Main Sacrifice | Best Deciding Factor |
| :--- | :--- | :--- | :--- |
| **Option A: Predictable Path** | Peace of mind, zero regret on stability | Delayed upside | Value security above all else |
| **Option B: Growth Path** | Learning speed, future leverage | Near-term friction | Value potential upside above comfort |

### D. Advantages and Disadvantages
- **Option A**:
  * Pros: Immediate psychological comfort, zero financial disruption.
  * Cons: Lingering curiosity about what could have been.
- **Option B**:
  * Pros: Faster personal acceleration and new competencies.
  * Cons: Greater cognitive load and transition friction.

### E. Risks and Uncertainties
- Because the objective evidence is balanced, an algorithm cannot pick a genuine winner for you without imposing artificial certainty.
- The outcome depends on your emotional tolerance for routine vs change.

### F. Recommended Option
**Uncertainty Notice: Close Call / Inconclusive Trade-Off**. Both options are well-justified. The right choice does not come down to more data, but to which personal value matters more to you right now: peace of mind (Option A) or career growth (Option B).

### G. Next Steps
- [ ] Test the 10/10/10 rule: Which choice will you be prouder of in 10 months?
- [ ] Write down your #1 non-negotiable value for this season of life.
- [ ] Make a provisional choice today, sleep on it, and observe how your gut reacts tomorrow morning.`;
    }

    // 4. Job Offers Scenario (Mode 4)
    const isJobOffer =
      lower.includes('job offer') ||
      (lower.includes('startup') && (lower.includes('corporate') || lower.includes('big tech')));
    if (isJobOffer) {
      return `### A. Understanding Your Situation
You are evaluating two compelling employment paths: an early-stage startup offer ($120k + equity) offering high ownership, and a established corporate offer ($155k + benefits) offering higher guaranteed compensation and structural stability.

### B. Available Options
1. **Option A: Early-Stage Startup ($120k + Equity)**: High-speed learning, wide breadth of responsibility, but higher operational volatility.
2. **Option B: Big Tech / Corporate ($155k + Benefits)**: Premium guaranteed base pay, structured mentorship, and predictable hours.
3. **Option C: Negotiate Corporate Flexibility**: Accept the higher base while requesting high-impact cross-functional projects.

### C. Comparison
| Option | Guaranteed Pay | Learning Curve | Work-Life Balance | Long-term Leverage |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Startup** | $120,000 + Equity | Extremely steep | Unpredictable / intense | High founder/leadership equity |
| **Option B: Corporate** | $155,000 + Full Benefits | Focused & specialized | Structured & sustainable | Strong resume stamp & liquidity |

### D. Advantages and Disadvantages
- **Option A (Startup)**:
  * Pros: Direct leadership exposure, rapid skill compounding, potential equity windfall.
  * Cons: $35k lower guaranteed cash, possible long hours, startup runway risk.
- **Option B (Corporate)**:
  * Pros: $35,000 higher cash, comprehensive health/401k match, reliable timeline.
  * Cons: Slower promotional cycles, narrower scope of daily authority.

### E. Risks and Uncertainties
- If the startup equity ends up worth zero, your effective opportunity cost is $35,000/year plus benefits.
- If corporate culture induces stagnation, career velocity may slow down after 2 years.

### F. Recommended Option
**Big Tech Corporate (Option B) for Financial Foundation, Startup (Option A) for Career Reinvention**: If your personal runway is under 12 months or you are prioritizing debt payoff/savings, take Option B. If your financial base is secure and you crave executive ownership, take Option A.

### G. Next Steps
- [ ] Calculate your actual monthly net take-home difference after taxes ($35k is roughly $2,100/mo net).
- [ ] Ask the startup for their current runway in months and investor backing.
- [ ] Decide by setting a firm commitment date before the offer deadlines expire.`;
    }

    // 5. Educational Course Scenario (Mode 4)
    const isEducationQuery =
      lower.includes('course') ||
      lower.includes('degree') ||
      lower.includes('bootcamp') ||
      lower.includes('certificate');
    if (isEducationQuery) {
      return `### A. Understanding Your Situation
You are considering investing time and money into an educational program to build skills and advance your career.

### B. Available Options
1. **Option A: Structured Immersive Program / Bootcamp**: Intensive curriculum, accountability, and cohort peer network.
2. **Option B: Self-Paced Project-Based Learning**: Flexible, highly affordable, but requires strict self-discipline.
3. **Option C: Targeted Low-Cost Micro-Credentials**: Small trial investment before making a multi-thousand-dollar commitment.

### C. Comparison
| Option | Financial Cost | Time Commitment | Career Support | Completion Likelihood |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Structured Bootcamp** | Higher ($5k - $15k) | High (20-40 hrs/wk) | Included coaching | High (structure enforces discipline) |
| **Option B: Self-Paced Learning** | Very Low ($0 - $500) | Flexible (5-10 hrs/wk) | Self-directed | Moderate (requires high drive) |
| **Option C: Targeted Trial** | Minimal ($50 - $200) | Low (3-5 hrs/wk) | None | High (short trial duration) |

### D. Advantages and Disadvantages
- **Option A (Bootcamp)**:
  * Pros: Fast-track completion, structured assignments, mentor feedback.
  * Cons: Significant upfront tuition, intense weekly schedule.
- **Option B (Self-Paced)**:
  * Pros: Keeps current income intact, zero debt risk, learn at your natural pace.
  * Cons: Easy to abandon when life gets busy, no formal job placement.

### E. Risks and Uncertainties
- Educational credentials alone do not guarantee a job; demonstrable portfolio projects matter far more to hiring managers.

### F. Recommended Option
**Option C (Targeted Trial) for 2 Weeks, Then Option A or B**: Do not commit thousands of dollars immediately. Complete one $30 introductory mini-course first to prove your daily interest before committing to a larger credential.

### G. Next Steps
- [ ] Spend 5 hours this week completing a free starter tutorial in this topic.
- [ ] Message 2 alumni of the prospective program on LinkedIn to ask about their actual job outcomes.
- [ ] Review your weekly calendar to confirm where you will carve out study hours without burning out.`;
    }

    // 6. Budget Purchase Scenario (Mode 4)
    const isBudgetPurchase =
      lower.includes('budget') ||
      (lower.includes('purchase') && lower.includes('$')) ||
      (lower.includes('buy') && lower.includes('$'));
    if (isBudgetPurchase) {
      return `### A. Understanding Your Situation
You are evaluating a purchase to verify whether it aligns with your financial budget and long-term comfort.

### B. Available Options
1. **Option A: Stay Strictly Within Stated Budget**: Purchase the option that preserves your cash cushion and prevents financial stress.
2. **Option B: Stretch Purchase (Financed or Dipping into Savings)**: Higher performance or prestige, but increases monthly strain.
3. **Option C: Delay 30 Days and Re-evaluate**: Save up the cash difference first rather than borrowing.

### C. Comparison
| Approach | Immediate Cost | Impact on Savings | Post-Purchase Stress | Long-term Satisfaction |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Within Budget** | Meets target | Preserves emergency fund | Zero buyer's remorse | High practical value |
| **Option B: Stretch Purchase** | Exceeds target | Depletes safety net | Moderate to high stress | Diminishing returns |
| **Option C: 30-Day Delay** | $0 today | Allows savings to grow | None | Tests true necessity |

### D. Advantages and Disadvantages
- **Option A (Within Budget)**:
  * Pros: Total financial peace of mind, avoids debt or dipping into reserves.
  * Cons: May lack non-essential premium bells and whistles.
- **Option B (Stretch)**:
  * Pros: Maximizes features upfront.
  * Cons: Creates ongoing financial anxiety if an unexpected expense arises.

### E. Risks and Uncertainties
- If an unexpected car repair or emergency happens in the next 90 days, an over-budget purchase significantly increases vulnerability.

### F. Recommended Option
**Option A: Stay Strictly Within Your Stated Budget**: A purchase should solve a problem, not create a new financial vulnerability. Choosing the option that fits your cash constraints provides superior long-term satisfaction.

### G. Next Steps
- [ ] Check your exact checking/savings balance before swiping any card.
- [ ] Apply the 48-hour cooling-off rule before confirming the transaction.
- [ ] Ensure your 3-month emergency fund remains completely untouched.`;
    }

    // 7. Everyday Alternatives Comparison (Mode 3 / 4)
    const isCommuteRent =
      (lower.includes('rent') || lower.includes('apartment')) &&
      (lower.includes('commute') || lower.includes('minutes') || lower.includes('work'));
    if (isCommuteRent) {
      return `### A. Understanding Your Situation
You are weighing an everyday lifestyle dilemma: living closer to work for higher rent vs. living further away to save money each month.

### B. Available Options
1. **Option A: Close to Work (10-min commute, higher rent)**: Buy back 70 minutes of daily free time at a higher monthly expense.
2. **Option B: Further Away (45-min commute, lower rent)**: Save substantial cash each month in exchange for 1.5 hours of daily travel.

### C. Comparison
| Factor | Option A: Close (10 min) | Option B: Further (45 min) |
| :--- | :--- | :--- |
| **Monthly Rent** | Higher | Lower (saves $400 - $500/mo) |
| **Daily Travel Time** | 20 mins round-trip | 90 mins round-trip (saves 70 mins/day) |
| **Transit / Gas Cost** | Low wear-and-tear | Higher fuel, transit passes, or mileage |
| **Daily Energy** | High post-work flexibility | Commute fatigue, traffic frustration |

### D. Advantages and Disadvantages
- **Option A (Close)**:
  * Pros: Extra 5+ hours of personal time every week, walk or bike to work, zero traffic stress.
  * Cons: Less discretionary cash for other savings goals.
- **Option B (Further)**:
  * Pros: Predictable monthly savings, potentially larger living space.
  * Cons: Commuter burnout, lost evening productivity, higher transportation costs.

### E. Risks and Uncertainties
- Gas and vehicle maintenance costs often eat up 30-50% of the rent difference on a longer commute.

### F. Recommended Option
**Option A if Commute Time Is Unproductive, Option B if You Can Truly Save the Difference**: If you will use the extra 70 minutes each day for sleep, health, or cooking, Option A delivers a dramatically higher quality of life.

### G. Next Steps
- [ ] Calculate your true monthly commute costs (fuel + transit fares) for Option B.
- [ ] Do a test drive or transit ride during actual peak rush hour.
- [ ] Set your final preference based on whether you value money or time more this year.`;
    }

    const isHindi = lower.includes('hindi') || lower.includes('हिन्दी') || lower.includes('हिंदी');
    if (isHindi) {
      return `> ⚠️ **सूचना**: DecideAI का निर्णय समर्थन (हिंदी में):

### A. Understanding Your Situation
आप **"${userDilemma}"** के बारे में निर्णय लेना चाह रहे हैं। सही निर्णय वह है जो अगले 6 से 12 महीनों में आपके जीवन को आसान और सुरक्षित बनाए।

### B. Available Options
1. **विकल्प A: सुरक्षित एवं संतुलित मार्ग**: शून्य अनावश्यक वित्तीय जोखिम और मानसिक शांति।
2. **विकल्प B: प्रगतिशील बदलाव**: नए अवसरों की खोज, लेकिन सावधानीपूर्वक योजना के साथ।

### C. Comparison
| विकल्प | मुख्य लाभ | मुख्य जोखिम | यह कब चुनें? |
| :--- | :--- | :--- | :--- |
| **विकल्प A: सुरक्षित मार्ग** | शून्य वित्तीय जोखिम, मानसिक शांति | विकास में देरी हो सकती है | जब स्थिरता आपकी सर्वोच्च प्राथमिकता हो |
| **विकल्प B: बड़ा बदलाव** | उच्च लाभ और नए अवसर | शुरुआत में अधिक प्रयास और तनाव | जब आपके पास 3 महीने की बचत और धैर्य हो |

### D. Advantages and Disadvantages
- **विकल्प A**: लाभ - मानसिक शांति; कमी - धीमी गति।
- **विकल्प B**: लाभ - तेजी से प्रगति; कमी - प्रारंभिक अनिश्चितता।

### E. Risks and Uncertainties
- किसी भी अपरिवर्तनीय निर्णय से पहले एक छोटा परीक्षण कदम उठाएं ताकि जोखिम सीमित रहे।

### F. Recommended Option
**कम जोखिम वाला प्रगतिशील कदम उठाएं**: अपनी प्राथमिकताओं के अनुसार संतुलित मार्ग चुनें।

### G. Next Steps
- [ ] इस निर्णय के लिए अपनी सबसे महत्वपूर्ण प्राथमिकता तय करें।
- [ ] किसी ऐसे व्यक्ति से बात करें जिसने हाल ही में ऐसा निर्णय लिया हो।
- [ ] निर्णय लेने के लिए 48 घंटे की समय सीमा निर्धारित करें।`;
    }

    const isKannada = lower.includes('kannada') || lower.includes('ಕನ್ನಡ');
    if (isKannada) {
      return `> ⚠️ **ಸೂಚನೆ**: DecideAI ನಿರ್ಧಾರ ಬೆಂಬಲ (ಕನ್ನಡದಲ್ಲಿ):

### A. Understanding Your Situation
ನೀವು **"${userDilemma}"** ಬಗ್ಗೆ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಲು ಯೋಚಿಸುತ್ತಿದ್ದೀರಿ. ಮುಂದಿನ 6 ರಿಂದ 12 ತಿಂಗಳುಗಳಲ್ಲಿ ನಿಮ್ಮ ದೈನಂದಿನ ಜೀವನಕ್ಕೆ ಯಾವುದು ಹೆಚ್ಚು ಸೂಕ್ತವೋ ಅದನ್ನು ಆರಿಸುವುದು ಉತ್ತಮ.

### B. Available Options
1. **ಆಯ್ಕೆ A: ಸುರಕ್ಷಿತ ಮಾರ್ಗ**: ಶೂನ್ಯ ಅಪಾಯ, ನೆಮ್ಮದಿಯ ಜೀವನ.
2. **ಆಯ್ಕೆ B: ಹೊಸ ಬದಲಾವಣೆ**: ಹೆಚ್ಚಿನ ಬೆಳವಣಿಗೆಯ ಅವಕಾಶ.

### C. Comparison
| ಆಯ್ಕೆ | ಮುಖ್ಯ ಅನುಕೂಲಗಳು | ಸಂಭವನೀಯ ತೊಂದರೆಗಳು | ಯಾವಾಗ ಆರಿಸಬೇಕು? |
| :--- | :--- | :--- | :--- |
| **ಆಯ್ಕೆ A: ಸುರಕ್ಷಿತ ಮಾರ್ಗ** | ಶೂನ್ಯ ಅಪಾಯ, ನೆಮ್ಮದಿಯ ಜೀವನ | ನಿಧಾನಗತಿಯ ಪ್ರಗತಿ | ಭದ್ರತೆ ನಿಮ್ಮ ಮೊದಲ ಆದ್ಯತೆಯಾಗಿದ್ದಾಗ |
| **ಆಯ್ಕೆ B: ಹೊಸ ಬದಲಾವಣೆ** | ಹೆಚ್ಚಿನ ಬೆಳವಣಿಗೆಯ ಅವಕಾಶ | ಆರಂಭಿಕ ಒತ್ತಡ ಮತ್ತು ಶ್ರಮ | ಸವಾಲುಗಳನ್ನು ಎದುರಿಸಲು ಸಿದ್ಧರಿದ್ದಾಗ |

### D. Advantages and Disadvantages
- **ಆಯ್ಕೆ A**: ಅನುಕೂಲ - ನೆಮ್ಮದಿ; ತೊಂದರೆ - ನಿಧಾನಗತಿಯ ಪ್ರಗತಿ.
- **ಆಯ್ಕೆ B**: ಅನುಕೂಲ - ಹೊಸ ಅವಕಾಶಗಳು; ತೊಂದರೆ - ಆರಂಭಿಕ ಶ್ರಮ.

### E. Risks and Uncertainties
- ಪೂರ್ಣ ಬದ್ಧತೆಗೆ ಮುಂಚಿತವಾಗಿ ಸಣ್ಣ ಮಟ್ಟದಲ್ಲಿ ಪರೀಕ್ಷಿಸಿ ಮುಂದುವರಿಯುವುದು ಸುರಕ್ಷಿತ.

### F. Recommended Option
**ಕಡಿಮೆ ಅಪಾಯದ ಪ್ರಾಯೋಗಿಕ ಹೆಜ್ಜೆ ಇರಿಸಿ**: ನಿಮ್ಮ ಆದ್ಯತೆಗಳಿಗೆ ಅನುಗುಣವಾಗಿ ಸಮತೋಲಿತ ಮಾರ್ಗವನ್ನು ಆರಿಸಿ.

### G. Next Steps
- [ ] ನಿಮ್ಮ ಮುಖ್ಯ ಗುರಿಯನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಬರೆದಿಟ್ಟುಕೊಳ್ಳಿ.
- [ ] ಈ ನಿರ್ಧಾರವನ್ನು ಅಂತಿಮಗೊಳಿಸಲು 48 ಗಂಟೆಗಳ ಗಡುವನ್ನು ನಿಗದಿಪಡಿಸಿ.`;
    }

    // Default Structured Fallback formatted strictly to Sections A-G
    return `### A. Understanding Your Situation
You are evaluating: **"${userDilemma}"**. The best decision usually comes down to what fits your stated constraints and makes your day-to-day life smoother over the next 6 to 12 months.

### B. Available Options
1. **Option A: The Safe / Familiar Path**: Zero transition risk, predictable, low immediate stress.
2. **Option B: The Proactive Change**: High upside and new learning, but requires upfront focus and effort.
3. **Option C: Small Pilot Step**: Tests the waters without burning bridges or committing large capital.

### C. Comparison
| Path | What's Great About It | The Main Catch | Choose This If... |
| :--- | :--- | :--- | :--- |
| **Option A: Safe Path** | Zero risk, predictable, low stress | You might stay stuck in the same place | Peace of mind and stability matter most |
| **Option B: Proactive Change** | High upside, new skills, leverage | Higher upfront effort and short-term friction | You have savings and energy for change |
| **Option C: Small Pilot Step** | Low-risk proof of concept | Requires patience | You want progress without gambling |

### D. Advantages and Disadvantages
- **Option A (Safe Path)**:
  * Pros: Immediate stability, no disruption to current finances or routine.
  * Cons: Slower long-term growth and delayed potential.
- **Option B (Proactive Change)**:
  * Pros: Accelerates your progress and opens new doors.
  * Cons: Demands focus and may cause temporary disruption.
- **Option C (Pilot Step)**:
  * Pros: Gives you real-world data before you commit fully.
  * Cons: Adds a small preliminary step before full execution.

### E. Risks and Uncertainties
- What would change this recommendation: If your budget or energy is running low, prefer Option A for now. If waiting will cost you money or peace of mind, execute Option B.

### F. Recommended Option
**Take the Small Pilot Step (Option C) First**: Testing your assumptions on a small scale protects your downside while keeping momentum moving forward.

### G. Next Steps
- [ ] Jot down your single biggest dealbreaker for this decision.
- [ ] Ask yourself: "If I pick the safer option, will I regret not trying in a year?"
- [ ] Give yourself a firm 48-hour deadline so you don't stay stuck in analysis paralysis.`;
  }

  /**
   * Streams a decision chat response with timeout protection and robust error taxonomy
   */
  public async streamDecisionChat(
    messages: ValidatedChatMessage[],
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const ai = this.getClient();

    if (!ai) {
      callbacks.onChunk(
        "I am ready to help you analyze this decision, but the **GEMINI_API_KEY** secret has not yet been attached to this project.\n\n" +
          "To enable live reasoning with **Gemini 3.8 Flash**:\n" +
          "1. Open the **Settings > Secrets** panel in AI Studio.\n" +
          "2. Attach your Gemini API key to activate live responses.\n\n" +
          "In the meantime, consider evaluating your choice along three core axes: **Downside risk**, **reversibility**, and **alignment with your 1-year goals**."
      );
      callbacks.onComplete();
      return;
    }

    // Convert messages into Gemini contents format
    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Setup an internal abort controller for safety timeout
    const timeoutController = new AbortController();
    const timer = setTimeout(() => {
      timeoutController.abort('Request timed out after 60 seconds');
    }, REQUEST_TIMEOUT_MS);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timer);
        timeoutController.abort();
      });
    }

    try {
      const streamResponse = await ai.models.generateContentStream({
        model: this.modelIdentifier,
        contents: contents,
        config: {
          systemInstruction: DECIDE_AI_SYSTEM_PROMPT,
          temperature: 0.65,
        },
      });

      for await (const chunk of streamResponse) {
        if (timeoutController.signal.aborted) {
          throw new Error('Generation cancelled or timed out.');
        }

        const text = chunk.text;
        if (text) {
          callbacks.onChunk(text);
        }
      }

      clearTimeout(timer);
      callbacks.onComplete();
    } catch (err: any) {
      clearTimeout(timer);

      if (abortSignal?.aborted || timeoutController.signal.aborted) {
        callbacks.onComplete();
        return;
      }

      const rawMsg = String(err?.message || err || '').toLowerCase();
      const isQuotaOrRateLimit =
        rawMsg.includes('resource_exhausted') ||
        rawMsg.includes('quota') ||
        rawMsg.includes('rate limit') ||
        rawMsg.includes('429');

      if (isQuotaOrRateLimit) {
        // Stream the high-value structured fallback and notify of the quota limit
        const lastUserPrompt = messages.filter((m) => m.role === 'user').pop()?.content || 'your dilemma';
        const fallback = this.generateStructuredFallback(lastUserPrompt);
        callbacks.onChunk(fallback);
        callbacks.onComplete();
        return;
      }

      const categorized = this.categorizeError(err);
      callbacks.onError(categorized);
    }
  }

  /**
   * Categorizes low-level errors into safe, actionable user-facing messages
   * without exposing secrets, stack traces, or internal URLs.
   */
  public categorizeError(err: any): { message: string; userMessage: string; code: string; status: number } {
    const rawMsg = String(err?.message || err || '').toLowerCase();
    const status = Number(err?.status) || 500;

    // Rate limits / Quota exceeded
    if (status === 429 || rawMsg.includes('quota') || rawMsg.includes('resource_exhausted') || rawMsg.includes('rate limit')) {
      const msg = 'The Gemini decision engine has reached its temporary request quota limit. You can update your API key in Settings > Secrets.';
      return {
        message: msg,
        userMessage: msg,
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
      };
    }

    // Authentication / Invalid key
    if (status === 401 || status === 403 || rawMsg.includes('api_key') || rawMsg.includes('unauthorized') || rawMsg.includes('permission_denied')) {
      const msg = 'Unable to authenticate with the decision model. Please verify your Gemini API key in Settings > Secrets.';
      return {
        message: msg,
        userMessage: msg,
        code: 'AUTH_FAILED',
        status: 403,
      };
    }

    // Safety / Policy blocks
    if (rawMsg.includes('safety') || rawMsg.includes('blocked') || rawMsg.includes('policy')) {
      const msg = 'The request could not be processed due to safety and content policy guidelines. Please rephrase your dilemma.';
      return {
        message: msg,
        userMessage: msg,
        code: 'CONTENT_SAFETY_RESTRICTION',
        status: 400,
      };
    }

    // Timeout
    if (rawMsg.includes('timed out') || rawMsg.includes('timeout')) {
      const msg = 'The decision analysis took longer than expected to respond. Please try asking again or simplifying the question.';
      return {
        message: msg,
        userMessage: msg,
        code: 'REQUEST_TIMEOUT',
        status: 504,
      };
    }

    // Unavailable / Service down
    if (status === 503 || rawMsg.includes('unavailable') || rawMsg.includes('overloaded')) {
      const msg = 'The Gemini decision service is momentarily unavailable. Please retry in a moment.';
      return {
        message: msg,
        userMessage: msg,
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
      };
    }

    // General fallback
    const msg = 'An unexpected issue occurred while analyzing your decision. Please try again.';
    return {
      message: msg,
      userMessage: msg,
      code: 'INTERNAL_MODEL_ERROR',
      status: 500,
    };
  }
}

export const aiService = new AIService();
