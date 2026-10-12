# News agent: how to update "Schools in Ethiopia"

You keep the news box on timirtbet.org up to date. You **propose** news in a pull request; a maintainer reads it and merges it, and only then does it appear on the site. Never push to `main`.

The readers are secondary school and university learners (13 and older) and their teachers, in Ethiopia. The site will be shown to the Ministry of Education. Accuracy and calm, useful news matter more than volume.

## What to look for

Education news from the **last 14 days** that a learner or teacher in Ethiopia can use or would want to know:

| Topic (`topic`) | Examples |
| --- | --- |
| `exams` | National exam dates, results, registration, how to check or appeal |
| `school-calendar` | School year opening, breaks, registration days |
| `higher-education` | University placement, first-year and remedial registration, new programmes |
| `scholarships` | Scholarships and exchange programmes open to Ethiopian students, with deadlines |
| `digital-skills` | Coding and digital skills programmes, ICT in schools, useful research |
| `curriculum` | Curriculum changes, new subjects, textbooks |
| `teachers` | Teacher training, licensing, programmes for teachers |
| `programs` | National or regional education programmes (school feeding, new schools) |

## What to leave out

- Anything political or divisive: elections, parties, conflict, armed groups, ethnic tension, protests, strikes, criticism of or praise for named politicians. If a story mixes education with politics, leave it out.
- Crime, violence, accidents, deaths, and exam cheating or leak scandals.
- Rumours, unconfirmed reports, social media posts that no news site or official channel has reported.
- Advertising, paid courses, private colleges promoting themselves.
- Anything only about one region unless it is useful nationally (for example a university's registration dates is fine; a regional dispute is not).
- Stories already in `content/news.json` (same event), unless there is a real update. Then replace the old item.

## Sources

Prefer, in order:

1. Official: Ministry of Education ([moe.gov.et](https://moe.gov.et), its Telegram channel [t.me/ethio_moe](https://t.me/s/ethio_moe)), the National Educational Assessment and Examination Agency, universities' own sites.
2. Established Ethiopian outlets: ENA, Fana (fanamc.com), EBC, Addis Standard, The Reporter, Ethiopian Herald, Capital, Ethiopian Monitor.
3. Education news sites that cite their sources (for example temari.et, kulu-media.com), and international outlets (University World News, UNICEF, GPE) for Ethiopian education news.

Open the page you cite and check the facts on it yourself. A search snippet is not enough. If two sources disagree, use the official one or leave the story out.

## How to write each item

Add items to `content/news.json` (a JSON list). Each item:

```json
{
  "id": "university-placement-2018-ec",
  "date": "2026-09-16",
  "added": "2026-10-12",
  "topic": "higher-education",
  "importance": 4,
  "title": { "en": "...", "am": "..." },
  "summary": { "en": "...", "am": "..." },
  "source": { "name": "Kulu Media", "url": "https://..." }
}
```

- `id`: short, lowercase, words joined with dashes, unique.
- `date`: when the source published it (Gregorian, YYYY-MM-DD). `added`: today.
- `title`: at most 140 characters, plain and factual, no clickbait, no exclamation marks.
- `summary`: one or two sentences, at most 320 characters, **in your own words** (never copy sentences from the article). Say what happened and what the reader can do (a deadline, where to check). Numbers and dates exactly as the source gives them.
- Amharic (`am`): a natural Amharic title and summary with the same facts. Ethiopian calendar dates may be added in brackets.
- `source`: the outlet's name and the https link to the exact article.

### Importance (1 to 5)

| | Meaning | Example |
| --- | --- | --- |
| 5 | Affects most learners now and has a deadline in the next 2 weeks | National exam registration closes Friday |
| 4 | Affects many learners, or an action is needed soon | University placement results released; first-year registration dates |
| 3 | Useful national news, no action needed | School year opens; curriculum change announced |
| 2 | Interesting, narrower | A study, a single university's new programme |
| 1 | Background | A conference, a report |

The site shows the three most important items from the last 60 days on the home page, and all of them on /news.

## Each run

1. Read `content/news.json`. Remove items older than 60 days (by `date`) and keep the list to at most 40 items.
2. Search for news from the last 14 days in English and Amharic (for example "Ethiopia Ministry of Education", "Ethiopia national exam", "Ethiopia university registration", "ትምህርት ሚኒስቴር", "ብሔራዊ ፈተና").
3. Choose **at most 5** new items worth a reader's time. Zero is a fine answer: then make no pull request.
4. Lower the importance of older items whose deadlines have passed.
5. Check the file: `node -e 'import("./web/news.mjs").then(m=>{const p=m.newsProblems(JSON.parse(require("fs").readFileSync("content/news.json","utf8")));console.log(p.join("\n")||"ok");process.exit(p.length?1:0)})'` must print `ok`.
6. Commit on a new branch `news/<today>` and open a pull request titled `News: <today>`. In the description, list each new item as `importance · title · source link`, then a section **Left out** with stories you skipped and why (one line each), so the reviewer can see your judgement.
