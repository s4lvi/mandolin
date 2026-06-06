// HSK 1 Course Data — ~150 words split into 15 themed lessons
// Source: Official HSK 1 vocabulary list

export interface SeedCard {
  hanzi: string
  pinyin: string
  english: string
  type: "VOCABULARY" | "GRAMMAR" | "PHRASE" | "IDIOM"
  notes?: string
  tags: string[]
}

export interface SeedLesson {
  order: number
  title: string
  description: string
  notes: string
  cards: SeedCard[]
}

export const HSK1_COURSE = {
  slug: "hsk-1",
  title: "HSK 1",
  description: "The foundation of Mandarin Chinese. Learn 150 essential words covering greetings, numbers, family, food, daily life, and basic grammar patterns.",
  level: 1,
  isBuiltIn: true,
}

export const HSK1_LESSONS: SeedLesson[] = [
  {
    order: 1,
    title: "Greetings & Basics",
    description: "Essential greetings and polite expressions for daily interactions.",
    notes: "This lesson covers the most fundamental Chinese greetings. These are the first words you'll use in any conversation.",
    cards: [
      { hanzi: "你好", pinyin: "nǐ hǎo", english: "hello", type: "PHRASE", tags: ["HSK-1", "greeting"] },
      { hanzi: "谢谢", pinyin: "xièxie", english: "thank you", type: "PHRASE", tags: ["HSK-1", "greeting"] },
      { hanzi: "再见", pinyin: "zàijiàn", english: "goodbye", type: "PHRASE", tags: ["HSK-1", "greeting"] },
      { hanzi: "不客气", pinyin: "bú kèqi", english: "you're welcome", type: "PHRASE", tags: ["HSK-1", "greeting"] },
      { hanzi: "对不起", pinyin: "duìbuqǐ", english: "sorry", type: "PHRASE", tags: ["HSK-1", "greeting"] },
      { hanzi: "没关系", pinyin: "méi guānxi", english: "it doesn't matter; no problem", type: "PHRASE", tags: ["HSK-1", "greeting"] },
      { hanzi: "请", pinyin: "qǐng", english: "please", type: "VOCABULARY", tags: ["HSK-1", "greeting"] },
      { hanzi: "好", pinyin: "hǎo", english: "good; well", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "是", pinyin: "shì", english: "to be (am/is/are)", type: "VOCABULARY", notes: "Used to equate two things: A 是 B = A is B", tags: ["HSK-1", "verb"] },
      { hanzi: "不", pinyin: "bù", english: "not; no", type: "VOCABULARY", notes: "Negation word placed before verbs/adjectives", tags: ["HSK-1", "grammar"] },
    ]
  },
  {
    order: 2,
    title: "Pronouns & People",
    description: "Personal pronouns and words for referring to people.",
    notes: "Chinese pronouns are simpler than English — no case changes. Add 们 to make plural.",
    cards: [
      { hanzi: "我", pinyin: "wǒ", english: "I; me", type: "VOCABULARY", tags: ["HSK-1", "pronoun"] },
      { hanzi: "你", pinyin: "nǐ", english: "you", type: "VOCABULARY", tags: ["HSK-1", "pronoun"] },
      { hanzi: "他", pinyin: "tā", english: "he; him", type: "VOCABULARY", tags: ["HSK-1", "pronoun"] },
      { hanzi: "她", pinyin: "tā", english: "she; her", type: "VOCABULARY", notes: "Same pronunciation as 他 but different character", tags: ["HSK-1", "pronoun"] },
      { hanzi: "我们", pinyin: "wǒmen", english: "we; us", type: "VOCABULARY", tags: ["HSK-1", "pronoun"] },
      { hanzi: "他们", pinyin: "tāmen", english: "they; them", type: "VOCABULARY", tags: ["HSK-1", "pronoun"] },
      { hanzi: "人", pinyin: "rén", english: "person; people", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "朋友", pinyin: "péngyou", english: "friend", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "先生", pinyin: "xiānsheng", english: "Mr.; sir; husband", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "小姐", pinyin: "xiǎojiě", english: "Miss; young lady", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
    ]
  },
  {
    order: 3,
    title: "Numbers",
    description: "Count from 1 to 100 and learn basic number expressions.",
    notes: "Chinese numbers are very logical. Learn 1-10 and you can count to 99 by combining them.",
    cards: [
      { hanzi: "一", pinyin: "yī", english: "one; 1", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "二", pinyin: "èr", english: "two; 2", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "三", pinyin: "sān", english: "three; 3", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "四", pinyin: "sì", english: "four; 4", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "五", pinyin: "wǔ", english: "five; 5", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "六", pinyin: "liù", english: "six; 6", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "七", pinyin: "qī", english: "seven; 7", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "八", pinyin: "bā", english: "eight; 8", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "九", pinyin: "jiǔ", english: "nine; 9", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "十", pinyin: "shí", english: "ten; 10", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "百", pinyin: "bǎi", english: "hundred; 100", type: "VOCABULARY", tags: ["HSK-1", "number"] },
      { hanzi: "几", pinyin: "jǐ", english: "how many; several", type: "VOCABULARY", notes: "Used for small numbers (usually under 10)", tags: ["HSK-1", "number"] },
    ]
  },
  {
    order: 4,
    title: "Time & Dates",
    description: "Talk about time, days, and dates.",
    notes: "Chinese dates go from largest to smallest: year → month → day. Time words often come before the verb.",
    cards: [
      { hanzi: "今天", pinyin: "jīntiān", english: "today", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "明天", pinyin: "míngtiān", english: "tomorrow", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "昨天", pinyin: "zuótiān", english: "yesterday", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "年", pinyin: "nián", english: "year", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "月", pinyin: "yuè", english: "month; moon", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "日", pinyin: "rì", english: "day; date; sun", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "星期", pinyin: "xīngqī", english: "week", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "现在", pinyin: "xiànzài", english: "now", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "时候", pinyin: "shíhou", english: "time; moment", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "点", pinyin: "diǎn", english: "o'clock; point", type: "VOCABULARY", notes: "三点 = 3 o'clock", tags: ["HSK-1", "time"] },
    ]
  },
  {
    order: 5,
    title: "Family",
    description: "Words for family members and relationships.",
    notes: "Chinese has more specific family terms than English — different words for older/younger siblings, maternal/paternal grandparents.",
    cards: [
      { hanzi: "爸爸", pinyin: "bàba", english: "dad; father", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "妈妈", pinyin: "māma", english: "mom; mother", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "儿子", pinyin: "érzi", english: "son", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "女儿", pinyin: "nǚ'ér", english: "daughter", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "家", pinyin: "jiā", english: "home; family", type: "VOCABULARY", tags: ["HSK-1", "family", "noun"] },
      { hanzi: "哥哥", pinyin: "gēge", english: "older brother", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "姐姐", pinyin: "jiějie", english: "older sister", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "弟弟", pinyin: "dìdi", english: "younger brother", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "妹妹", pinyin: "mèimei", english: "younger sister", type: "VOCABULARY", tags: ["HSK-1", "family"] },
      { hanzi: "爱", pinyin: "ài", english: "to love", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
    ]
  },
  {
    order: 6,
    title: "Food & Drink",
    description: "Essential food and drink vocabulary for restaurants and daily life.",
    notes: "Eating and drinking are central to Chinese culture. 吃 (eat) and 喝 (drink) are among the most used verbs.",
    cards: [
      { hanzi: "水", pinyin: "shuǐ", english: "water", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
      { hanzi: "茶", pinyin: "chá", english: "tea", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
      { hanzi: "米饭", pinyin: "mǐfàn", english: "cooked rice", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
      { hanzi: "菜", pinyin: "cài", english: "vegetable; dish", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
      { hanzi: "水果", pinyin: "shuǐguǒ", english: "fruit", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
      { hanzi: "吃", pinyin: "chī", english: "to eat", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "喝", pinyin: "hē", english: "to drink", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "饭店", pinyin: "fàndiàn", english: "restaurant; hotel", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
      { hanzi: "杯子", pinyin: "bēizi", english: "cup; glass", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "苹果", pinyin: "píngguǒ", english: "apple", type: "VOCABULARY", tags: ["HSK-1", "food", "noun"] },
    ]
  },
  {
    order: 7,
    title: "Places & Location",
    description: "Words for places and describing where things are.",
    notes: "Location in Chinese uses 在 (at/in) + place. Direction words like 前面/后面 come after the noun.",
    cards: [
      { hanzi: "这儿", pinyin: "zhèr", english: "here", type: "VOCABULARY", tags: ["HSK-1", "place"] },
      { hanzi: "那儿", pinyin: "nàr", english: "there", type: "VOCABULARY", tags: ["HSK-1", "place"] },
      { hanzi: "哪儿", pinyin: "nǎr", english: "where", type: "VOCABULARY", tags: ["HSK-1", "place", "question"] },
      { hanzi: "学校", pinyin: "xuéxiào", english: "school", type: "VOCABULARY", tags: ["HSK-1", "place", "noun"] },
      { hanzi: "医院", pinyin: "yīyuàn", english: "hospital", type: "VOCABULARY", tags: ["HSK-1", "place", "noun"] },
      { hanzi: "商店", pinyin: "shāngdiàn", english: "shop; store", type: "VOCABULARY", tags: ["HSK-1", "place", "noun"] },
      { hanzi: "中国", pinyin: "Zhōngguó", english: "China", type: "VOCABULARY", tags: ["HSK-1", "place", "noun"] },
      { hanzi: "北京", pinyin: "Běijīng", english: "Beijing", type: "VOCABULARY", tags: ["HSK-1", "place", "noun"] },
      { hanzi: "前面", pinyin: "qiánmiàn", english: "in front; ahead", type: "VOCABULARY", tags: ["HSK-1", "place"] },
      { hanzi: "后面", pinyin: "hòumiàn", english: "behind; at the back", type: "VOCABULARY", tags: ["HSK-1", "place"] },
    ]
  },
  {
    order: 8,
    title: "Common Verbs (Part 1)",
    description: "Essential action words for daily communication.",
    notes: "Chinese verbs don't conjugate — no past tense, no plural forms. Context and time words indicate when.",
    cards: [
      { hanzi: "去", pinyin: "qù", english: "to go", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "来", pinyin: "lái", english: "to come", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "看", pinyin: "kàn", english: "to look; to watch; to read", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "听", pinyin: "tīng", english: "to listen", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "说", pinyin: "shuō", english: "to speak; to say", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "读", pinyin: "dú", english: "to read aloud", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "写", pinyin: "xiě", english: "to write", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "叫", pinyin: "jiào", english: "to call; to be called", type: "VOCABULARY", notes: "我叫... = My name is...", tags: ["HSK-1", "verb"] },
      { hanzi: "有", pinyin: "yǒu", english: "to have; there is/are", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "在", pinyin: "zài", english: "at; in; to be at", type: "VOCABULARY", notes: "Indicates location: 我在学校 = I'm at school", tags: ["HSK-1", "verb", "grammar"] },
    ]
  },
  {
    order: 9,
    title: "Common Verbs (Part 2)",
    description: "More essential verbs for everyday situations.",
    notes: "These verbs cover shopping, working, and daily activities.",
    cards: [
      { hanzi: "买", pinyin: "mǎi", english: "to buy", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "做", pinyin: "zuò", english: "to do; to make", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "坐", pinyin: "zuò", english: "to sit; to take (transport)", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "住", pinyin: "zhù", english: "to live; to stay", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "工作", pinyin: "gōngzuò", english: "to work; work; job", type: "VOCABULARY", tags: ["HSK-1", "verb", "noun"] },
      { hanzi: "学习", pinyin: "xuéxí", english: "to study; to learn", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "认识", pinyin: "rènshi", english: "to know (a person); to recognize", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "想", pinyin: "xiǎng", english: "to think; to want; to miss", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "会", pinyin: "huì", english: "can; to be able to; will", type: "VOCABULARY", notes: "Indicates learned ability: 我会说中文", tags: ["HSK-1", "verb", "grammar"] },
      { hanzi: "能", pinyin: "néng", english: "can; to be able to", type: "VOCABULARY", notes: "Indicates physical/circumstantial ability", tags: ["HSK-1", "verb", "grammar"] },
    ]
  },
  {
    order: 10,
    title: "Descriptions",
    description: "Adjectives to describe people, things, and situations.",
    notes: "Chinese adjectives can function as verbs: 他很高 = He is tall (literally: he very tall). No 'is' needed.",
    cards: [
      { hanzi: "大", pinyin: "dà", english: "big; large", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "小", pinyin: "xiǎo", english: "small; little", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "多", pinyin: "duō", english: "many; much", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "少", pinyin: "shǎo", english: "few; little", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "冷", pinyin: "lěng", english: "cold", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "热", pinyin: "rè", english: "hot", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "高兴", pinyin: "gāoxìng", english: "happy; glad", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "漂亮", pinyin: "piàoliang", english: "pretty; beautiful", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "很", pinyin: "hěn", english: "very; quite", type: "VOCABULARY", notes: "Often used before adjectives as a filler: 我很好", tags: ["HSK-1", "adverb"] },
      { hanzi: "太", pinyin: "tài", english: "too; extremely", type: "VOCABULARY", notes: "太...了 pattern: 太好了! = Great!", tags: ["HSK-1", "adverb"] },
    ]
  },
  {
    order: 11,
    title: "Shopping & Money",
    description: "Vocabulary for shopping, prices, and transactions.",
    notes: "Chinese currency: 元 (formal) / 块 (spoken) for yuan. Bargaining is common in markets.",
    cards: [
      { hanzi: "钱", pinyin: "qián", english: "money", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "块", pinyin: "kuài", english: "yuan (spoken); piece", type: "VOCABULARY", notes: "Informal unit of RMB: 十块钱 = 10 yuan", tags: ["HSK-1", "noun", "number"] },
      { hanzi: "多少", pinyin: "duōshao", english: "how many; how much", type: "VOCABULARY", notes: "多少钱？= How much?", tags: ["HSK-1", "question"] },
      { hanzi: "贵", pinyin: "guì", english: "expensive", type: "VOCABULARY", tags: ["HSK-1", "adjective"] },
      { hanzi: "东西", pinyin: "dōngxi", english: "thing; stuff", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "衣服", pinyin: "yīfu", english: "clothes", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "个", pinyin: "gè", english: "general measure word", type: "VOCABULARY", notes: "The most common measure word: 一个人, 两个苹果", tags: ["HSK-1", "grammar"] },
      { hanzi: "本", pinyin: "běn", english: "measure word for books", type: "VOCABULARY", notes: "一本书 = one book", tags: ["HSK-1", "grammar"] },
      { hanzi: "些", pinyin: "xiē", english: "some; a few", type: "VOCABULARY", tags: ["HSK-1", "grammar"] },
      { hanzi: "两", pinyin: "liǎng", english: "two (with measure words)", type: "VOCABULARY", notes: "Use 两 (not 二) before measure words: 两个人", tags: ["HSK-1", "number"] },
    ]
  },
  {
    order: 12,
    title: "Weather & Nature",
    description: "Talk about the weather and natural world.",
    notes: "Weather is a common small talk topic. 天气怎么样？(How's the weather?) is a great conversation starter.",
    cards: [
      { hanzi: "天气", pinyin: "tiānqì", english: "weather", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "下雨", pinyin: "xià yǔ", english: "to rain", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "电影", pinyin: "diànyǐng", english: "movie; film", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "电视", pinyin: "diànshì", english: "television", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "电脑", pinyin: "diànnǎo", english: "computer", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "书", pinyin: "shū", english: "book", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "桌子", pinyin: "zhuōzi", english: "table; desk", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "椅子", pinyin: "yǐzi", english: "chair", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "狗", pinyin: "gǒu", english: "dog", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "猫", pinyin: "māo", english: "cat", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
    ]
  },
  {
    order: 13,
    title: "Body & Health",
    description: "Basic body parts and health-related vocabulary.",
    notes: "Knowing body and health words is essential for doctor visits and daily life.",
    cards: [
      { hanzi: "医生", pinyin: "yīshēng", english: "doctor", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "老师", pinyin: "lǎoshī", english: "teacher", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "学生", pinyin: "xuésheng", english: "student", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "同学", pinyin: "tóngxué", english: "classmate", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "名字", pinyin: "míngzi", english: "name", type: "VOCABULARY", tags: ["HSK-1", "noun"] },
      { hanzi: "岁", pinyin: "suì", english: "years old", type: "VOCABULARY", notes: "我二十岁 = I'm 20 years old", tags: ["HSK-1", "noun"] },
      { hanzi: "打电话", pinyin: "dǎ diànhuà", english: "to make a phone call", type: "PHRASE", tags: ["HSK-1", "verb"] },
      { hanzi: "回", pinyin: "huí", english: "to return; to go back", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "睡觉", pinyin: "shuì jiào", english: "to sleep", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "开", pinyin: "kāi", english: "to open; to drive; to start", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
    ]
  },
  {
    order: 14,
    title: "Question Words & Grammar",
    description: "Essential question patterns and grammar particles.",
    notes: "Chinese questions keep the same word order as statements — just replace the answer with the question word. 他是谁？(He is who?) = Who is he?",
    cards: [
      { hanzi: "什么", pinyin: "shénme", english: "what", type: "VOCABULARY", tags: ["HSK-1", "question", "grammar"] },
      { hanzi: "谁", pinyin: "shéi", english: "who", type: "VOCABULARY", tags: ["HSK-1", "question", "grammar"] },
      { hanzi: "怎么", pinyin: "zěnme", english: "how; why", type: "VOCABULARY", tags: ["HSK-1", "question", "grammar"] },
      { hanzi: "怎么样", pinyin: "zěnmeyàng", english: "how about; how is it", type: "PHRASE", tags: ["HSK-1", "question"] },
      { hanzi: "吗", pinyin: "ma", english: "question particle", type: "GRAMMAR", notes: "Add to end of statement to make yes/no question: 你好吗？", tags: ["HSK-1", "grammar"] },
      { hanzi: "呢", pinyin: "ne", english: "question particle (and you?)", type: "GRAMMAR", notes: "Used for follow-up questions: 我很好，你呢？", tags: ["HSK-1", "grammar"] },
      { hanzi: "的", pinyin: "de", english: "possessive/descriptive particle", type: "GRAMMAR", notes: "我的书 = my book; 漂亮的女孩 = pretty girl", tags: ["HSK-1", "grammar"] },
      { hanzi: "了", pinyin: "le", english: "completed action particle", type: "GRAMMAR", notes: "Indicates completed action: 我吃了 = I ate", tags: ["HSK-1", "grammar"] },
      { hanzi: "和", pinyin: "hé", english: "and; with", type: "VOCABULARY", tags: ["HSK-1", "grammar"] },
      { hanzi: "都", pinyin: "dōu", english: "all; both", type: "VOCABULARY", notes: "Placed before the verb: 我们都是学生", tags: ["HSK-1", "adverb", "grammar"] },
    ]
  },
  {
    order: 15,
    title: "Daily Life & Transport",
    description: "Remaining HSK 1 vocabulary for daily activities and getting around.",
    notes: "These words round out your HSK 1 foundation, covering transport, daily objects, and useful expressions.",
    cards: [
      { hanzi: "出租车", pinyin: "chūzūchē", english: "taxi", type: "VOCABULARY", tags: ["HSK-1", "noun", "transport"] },
      { hanzi: "飞机", pinyin: "fēijī", english: "airplane", type: "VOCABULARY", tags: ["HSK-1", "noun", "transport"] },
      { hanzi: "火车站", pinyin: "huǒchēzhàn", english: "train station", type: "VOCABULARY", tags: ["HSK-1", "noun", "transport", "place"] },
      { hanzi: "上", pinyin: "shàng", english: "up; above; to go to", type: "VOCABULARY", notes: "上学 = go to school; 上面 = above", tags: ["HSK-1", "verb", "place"] },
      { hanzi: "下", pinyin: "xià", english: "down; below; next", type: "VOCABULARY", notes: "下午 = afternoon; 下面 = below", tags: ["HSK-1", "verb", "place"] },
      { hanzi: "里", pinyin: "lǐ", english: "inside; in", type: "VOCABULARY", tags: ["HSK-1", "place"] },
      { hanzi: "上午", pinyin: "shàngwǔ", english: "morning (before noon)", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "下午", pinyin: "xiàwǔ", english: "afternoon", type: "VOCABULARY", tags: ["HSK-1", "time"] },
      { hanzi: "喜欢", pinyin: "xǐhuan", english: "to like", type: "VOCABULARY", tags: ["HSK-1", "verb"] },
      { hanzi: "没有", pinyin: "méiyǒu", english: "to not have; there isn't", type: "VOCABULARY", notes: "Negation of 有: 我没有钱 = I don't have money", tags: ["HSK-1", "grammar", "verb"] },
    ]
  }
]
