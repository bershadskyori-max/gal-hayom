# Gal Hayom update robot.
# Usage: ruby scripts/update.rb [forecast|people|all]
# forecast - 5-day marine + wind forecast (no AI) -> data/data.json
# people - surfer reports (YouTube + Gemini) -> data/reports.json, and AI summary -> data/summary.json
# Needs GEMINI_API_KEY for "people". YOUTUBE_API_KEY and GEMINI_MODEL are optional.
require "net/http"
require "json"
require "time"
require "uri"

ENV["TZ"] = "Asia/Jerusalem"
ROOT = File.expand_path("..", __dir__)
DATA_DIR = File.join(ROOT, "data")
MODE = (ARGV[0] || "all").strip
MODE.replace("all") if MODE.empty?

GS = "https://gosurf.co.il/cameras/"
WF = "https://www.windfinder.com/webcams/"
BEACHES = [
["אכזיב", 33.050, 35.080, "גליל מערבי", []],
["נהריה", 33.010, 35.050, "גליל מערבי", [[GS + "sokolov", "נהריה – סוקולוב"]]],
["שבי ציון", 32.983, 35.060, "גליל מערבי", []],
["עכו – ארגמן", 32.915, 35.050, "גליל מערבי", []],
["קריית ים", 32.850, 35.055, "מפרץ חיפה", []],
["בת גלים", 32.830, 34.955, "חיפה", [[GS + "haifa-casino-bat-galim", "חיפה – קזינו בת גלים"]]],
["דדו / מרידיאן", 32.795, 34.945, "חיפה", [[GS + "haifa-carmel", "חיפה – חוף הכרמל"]]],
["עתלית", 32.690, 34.915, "חוף הכרמל", []],
["דור – הבונים", 32.615, 34.905, "חוף הכרמל", []],
["מעגן מיכאל", 32.555, 34.890, "חוף הכרמל", [[GS + "maagan-michael", "מעגן מיכאל"]]],
["קיסריה", 32.500, 34.875, "שרון", [[GS + "sdot-yam", "שדות ים (צמוד)"]]],
["גבעת אולגה", 32.440, 34.860, "חדרה", [[GS + "olga", "חוף אולגה"]]],
["מכמורת", 32.405, 34.855, "עמק חפר", []],
["בית ינאי", 32.385, 34.850, "עמק חפר", []],
["נתניה – סירונית", 32.330, 34.835, "שרון", []],
["נתניה – פולג", 32.270, 34.820, "שרון", []],
["געש", 32.230, 34.810, "שרון", []],
["הרצליה – זבולון", 32.170, 34.790, "שרון", [[WF + "herzliya_marina", "מרינה הרצליה"], [WF + "9_beach", "הרצליה – צופי ים"], ["https://www.surf-forecast.com/breaks/Haambatia-Herzliya/webcams/latest", "הרצליה – האמבטיה"]]],
["תל אביב – מציצים", 32.100, 34.765, "גוש דן", []],
["תל אביב – הילטון", 32.090, 34.760, "גוש דן", [[GS + "hilton", "תל אביב – הילטון"]]],
["תל אביב – גורדון / פרישמן", 32.080, 34.758, "גוש דן", []],
["יפו – גבעת עליה", 32.045, 34.743, "גוש דן", []],
["בת ים", 32.020, 34.730, "גוש דן", []],
["ראשון לציון", 31.995, 34.722, "גוש דן", [[GS + "rishon-lezion", "ראשון לציון"]]],
["פלמחים", 31.930, 34.685, "שפלה", []],
["אשדוד – קשתות", 31.835, 34.635, "דרום", [[GS + "ashdod-kshatot", "אשדוד – קשתות"]]],
["אשדוד – מי עמי", 31.800, 34.620, "דרום", []],
["ניצנים", 31.740, 34.590, "דרום", []],
["אשקלון – בר כוכבא", 31.670, 34.540, "דרום", []],
["זיקים", 31.610, 34.505, "דרום", []]
].freeze

def get_json(url, tries: 3)
tries.times do |i|
uri = URI(url)
res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, read_timeout: 60, open_timeout: 20) { |h| h.get(uri.request_uri) }
return JSON.parse(res.body) if res.is_a?(Net::HTTPSuccess)
warn "GET #{uri.host} -> #{res.code} (try #{i + 1})"
sleep 5
rescue StandardError => e
warn "GET failed: #{e.class} (try #{i + 1})"
sleep 5
end
nil
end

def write_json(name, obj)
Dir.mkdir(DATA_DIR) unless Dir.exist?(DATA_DIR)
path = File.join(DATA_DIR, name)
File.write(path, JSON.generate(obj))
puts "wrote #{name} (#{File.size(path)} bytes)"
end

def update_forecast
lat = BEACHES.map { |b| b[1] }.join(",")
lon = BEACHES.map { |b| b[2] }.join(",")
tz = "Asia%2FJerusalem"
marine = get_json("https://marine-api.open-meteo.com/v1/marine?latitude=#{lat}&longitude=#{lon}&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,sea_surface_temperature&forecast_days=5&timezone=#{tz}")
wind = get_json("https://api.open-meteo.com/v1/forecast?latitude=#{lat}&longitude=#{lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&daily=sunrise,sunset&forecast_days=5&timezone=#{tz}")
unless marine.is_a?(Array) && wind.is_a?(Array) && marine.size == BEACHES.size && wind.size == BEACHES.size
warn "forecast fetch failed - keeping previous data.json"
return false
end
beaches = BEACHES.map { |b| { "n" => b[0], "r" => b[3], "cams" => b[4].map { |u, n| { "u" => u, "n" => n } } } }
write_json("data.json", { "updated" => Time.now.iso8601, "beaches" => beaches, "marine" => marine, "wind" => wind })
true
end
def height_score(h)
return 0 if h.nil? || h < 0.3
return (h - 0.3) / 0.3 * 3.5 if h < 0.6
return 3.5 + (h - 0.6) / 0.4 * 3 if h < 1
return 6.5 + [1, (h - 1) / 0.8].min * 2 if h <= 2.2
[3, 8.5 - (h - 2.2) * 2.2].max
end

def wind_type(dir, spd)
on = Math.cos((dir.to_f - 270) * Math::PI / 180)
return [on, "כמעט בלי רוח"] if spd.to_f < 8
[on, on > 0.5 ? "רוח מהים" : on < -0.4 ? "רוח מהיבשה" : "רוח צד"]
end

def hour_score(h, t, spd, dir)
return nil if h.nil?
s = height_score(h) + [[(t.to_f - 4) / 5, 0].max, 1].min * 2
on, = wind_type(dir, spd)
spd = spd.to_f
s += on.positive? ? -[4, (spd / 28) * 3.5 * on].min : [1, -on * (spd < 25 ? 1 : 0.3)].min
s -= 1.5 if spd > 35
s = [s, 1].min if h < 0.3
s.clamp(0, 10)
end

def forecast_context
d = JSON.parse(File.read(File.join(DATA_DIR, "data.json")))
times = d["marine"][0]["hourly"]["time"]
now_s = Time.now.strftime("%Y-%m-%dT%H:00")
now_i = times.index(now_s) || [times.count { |t| t < now_s } - 1, 0].max
today = Time.now.strftime("%Y-%m-%d")
tomorrow = (Time.now + 86_400).strftime("%Y-%m-%d")
lines = BEACHES.each_with_index.map do |(name), k|
m = d["marine"][k]["hourly"]; w = d["wind"][k]["hourly"]; dl = d["wind"][k]["daily"]
row = lambda do |i|
h = [m["wave_height"][i], m["swell_wave_height"][i]].compact.max
t = [m["wave_period"][i], m["swell_wave_period"][i]].compact.max
sc = hour_score(h, t, w["wind_speed_10m"][i], w["wind_direction_10m"][i])
_, wt = wind_type(w["wind_direction_10m"][i], w["wind_speed_10m"][i])
{ i: i, s: sc, txt: "ציון #{sc ? sc.round(1) : '-'}, גל #{h ? h.round(1) : '-'}מ, מחזור #{t ? t.round : '-'}ש, #{wt} #{w['wind_speed_10m'][i].to_f.round}קמ\"ש" }
end
best = lambda do |date, from|
di = dl["time"].index(date)
next nil unless di
sr = dl["sunrise"][di][0, 13]; ss = dl["sunset"][di]
idx = times.each_index.select { |i| times[i].start_with?(date) && times[i] >= sr && times[i] <= ss && i >= from }
idx.map { |i| row.call(i) }.max_by { |r| r[:s] || -1 }
end
parts = ["עכשיו: #{row.call(now_i)[:txt]}"]
[[today, "היום", now_i], [tomorrow, "מחר", 0]].each do |date, label, from|
b = best.call(date, from)
parts << "#{label} שיא ב-#{times[b[:i]][11, 5]}: #{b[:txt]}" if b
end
"#{name}: #{parts.join(' | ')}"
end
[lines.join("\n"), times[now_i][11, 5]]
end

MODELS = [ENV["GEMINI_MODEL"], "gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest"].compact.reject(&:empty?).uniq

def gemini(prompt, search: false)
key = ENV["GEMINI_API_KEY"].to_s
raise "GEMINI_API_KEY is missing" if key.empty?
body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }
body[:tools] = [{ google_search: {} }] if search
MODELS.each do |model|
uri = URI("https://generativelanguage.googleapis.com/v1beta/models/#{model}:generateContent")
req = Net::HTTP::Post.new(uri, "Content-Type" => "application/json", "x-goog-api-key" => key)
req.body = JSON.generate(body)
res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, read_timeout: 180) { |h| h.request(req) }
if res.is_a?(Net::HTTPSuccess)
j = JSON.parse(res.body)
cand = (j["candidates"] || [])[0] || {}
text = (cand.dig("content", "parts") || []).map { |p| p["text"] }.compact.join
chunks = (cand.dig("groundingMetadata", "groundingChunks") || []).map { |c| c["web"] }.compact
puts "gemini #{model}: #{text.size} chars, #{chunks.size} sources"
return [text, chunks]
end
warn "gemini #{model} -> #{res.code}: #{res.body[0, 300]}"
next if %w[404 400 429].include?(res.code)
raise "Gemini error #{res.code}"
end
raise "no Gemini model worked"
end

def extract_json(text)
a = text.index("{"); b = text.rindex("}")
return nil unless a && b && b > a
JSON.parse(text[a..b])
rescue JSON::ParserError
nil
end

BEACH_INDEX_TEXT = BEACHES.each_with_index.map { |(n), i| "#{i} #{n}" }.join(", ")
def youtube_search(q, after)
key = ENV["YOUTUBE_API_KEY"].to_s
url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&order=date&regionCode=IL&publishedAfter=#{URI.encode_www_form_component(after)}&q=#{URI.encode_www_form_component(q)}&key=#{key}"
j = get_json(url, tries: 1)
(j && j["items"]) || []
end

def collect_youtube
after = (Time.now - 26 * 3600).utc.iso8601
queries = BEACHES.map { |b| "גלישה #{b[0].split(' – ')[0].split(' / ')[0]}" }.uniq + ["גלישה גלים היום", "surf israel"]
seen = {}
vids = []
queries.each do |q|
youtube_search(q, after).each do |it|
id = it.dig("id", "videoId")
next if id.nil? || seen[id]
seen[id] = true
s = it["snippet"] || {}
vids << { "id" => id, "title" => s["title"].to_s, "desc" => s["description"].to_s[0, 300], "channel" => s["channelTitle"].to_s, "when" => s["publishedAt"].to_s }
end
end
vids
end

def youtube_reports(vids)
return {} if vids.empty?
list = vids.each_with_index.map { |v, i| "#{i}. [#{v['when']}] #{v['channel']}: #{v['title']} | #{v['desc']}" }.join("\n")
yprompt = <<~P
הנה סרטוני יוטיוב שעלו ב-26 השעות האחרונות.
בחר רק סרטונים שמראים או מתארים את מצב הים או סשן גלישה בחוף בישראל מהיום או מאתמול.
דלג על פרסומות, שיעורים כלליים, חו"ל, סרטונים ישנים שהועלו מחדש ודברים שלא קשורים לים.
התאם כל סרטון לאינדקס חוף (או null): #{BEACH_INDEX_TEXT}.
החזר JSON בלבד:
{"reports":[{"video":<מספר הסרטון ברשימה>,"beach":<אינדקס או null>,"spot":"<שם המקום אם beach הוא null>","text":"<משפט או שניים בעברית: מה רואים או אומרים על הגלים>","size":"<גודל הגל אם מוזכר, אחרת ריק>","rating":<1-5 כמה טוב נראה הים, או null>}]}
רשימה ריקה היא תשובה תקינה. אל תמציא.
הסרטונים:
#{list}
P
text, = (gemini(yprompt) rescue ["", []])
j = extract_json(text) || {}
j["reports"] = (j["reports"] || []).filter_map do |r|
v = r.is_a?(Hash) && r["video"].is_a?(Integer) ? vids[r["video"]] : nil
next unless v
r.merge("url" => "https://www.youtube.com/watch?v=#{v['id']}", "when" => v["when"], "source" => "יוטיוב")
end
j
end

def update_people
now = Time.now
if ENV["YOUTUBE_API_KEY"].to_s != ""
vids = collect_youtube
puts "youtube: #{vids.size} videos"
j = youtube_reports(vids)
j["sources_checked"] = ["יוטיוב"]
chunks = []
else
j, chunks = search_reports(now)
end
report_cleanup_and_summary(now, j, chunks)
end

def search_reports(now)
prompt = <<~P
עכשיו #{now.strftime('%Y-%m-%d %H:%M')} שעון ישראל.
חפש בגוגל דיווחים של גולשים אמיתיים על מצב הים והגלים בחופי הים התיכון בישראל מ-24 השעות האחרונות.
רק דברים שאנשים כתבו או צילמו בעצמם: פוסטים פתוחים, סרטונים שהועלו היום או אתמול, דיווחים יומיים של בתי ספר לגלישה, פורומים וכתבות על מצב הים היום.
אל תכלול מספרים אוטומטיים מאתרי תחזית. אל תמציא. רשימה ריקה היא תשובה תקינה.
התאם כל דיווח לאינדקס חוף (או null): #{BEACH_INDEX_TEXT}.
החזר JSON בלבד במבנה:
{"reports":[{"beach":<מספר או null>,"spot":"","source":"","when":"<ISO 8601>","text":"","size":"","rating":<1-5 או null>,"url":""}],"sources_checked":[""]}
עד 12 דיווחים, החדשים קודם.
P
text, chunks = (gemini(prompt, search: true) rescue ["", []])
[extract_json(text) || {}, chunks]
end
def report_cleanup_and_summary(now, j, chunks)
cutoff = now - 30 * 3600
reports = (j["reports"] || []).filter_map do |r|
next unless r.is_a?(Hash) && r["text"].to_s.strip != ""
t = (Time.parse(r["when"].to_s) rescue nil)
next unless t && t > cutoff && t < now + 3600
beach = r["beach"].is_a?(Integer) && r["beach"].between?(0, BEACHES.size - 1) ? r["beach"] : nil
url = r["url"].to_s
url = "" unless url.start_with?("http")
{ "beach" => beach, "spot" => r["spot"].to_s[0, 60], "source" => r["source"].to_s[0, 30], "when" => t.iso8601, "text" => r["text"].to_s[0, 300], "size" => r["size"].to_s[0, 30], "rating" => (r["rating"].is_a?(Numeric) ? r["rating"].clamp(1, 5) : nil), "url" => url }
end.first(12)
sources = (j["sources_checked"] || []).map(&:to_s).reject(&:empty?).first(8)
sources = ["אינסטגרם", "פייסבוק", "יוטיוב", "טיקטוק", "רדיט", "אתרי גלישה", "חדשות"] if sources.empty?
note = reports.empty? ? "בסריקה האחרונה לא נמצאו דיווחים של גולשים מה-24 שעות האחרונות." : ""
write_json("reports.json", { "scanned" => now.iso8601, "sources_checked" => sources, "reports" => reports, "note" => note, "web_sources" => chunks.size })

ctx, now_hm = forecast_context
people = reports.empty? ? "אין דיווחי גולשים עדכניים." : reports.map { |r| "#{r['beach'] ? BEACHES[r['beach']][0] : r['spot']} (#{r['source']}): #{r['text']}#{r['rating'] ? " [דירוג #{r['rating']}/5]" : ''}" }.join("\n")
sprompt = <<~P
אתה גולש ותיק בישראל שכותב לחבר סיכום קצר על מצב הגלים עכשיו ובשעות הקרובות (וגם מחר).
עברית מדוברת וטבעית, 3–4 משפטים, בלי כותרות, בלי רשימות ובלי אימוג'י.
ציין את החוף או שניים הכי טובים, את השעה הכי שווה, איזה גלשן מתאים (שורט/לונג/פאן), ואזור שכדאי לוותר עליו.
אם יש דיווחי גולשים, שלב אותם ואמור אם הם מאשרים או סותרים את התחזית. אם אין, אל תמציא.
ציון 0–10 = חישוב אוטומטי (גל, מחזור, רוח). רוח מהיבשה = טוב, רוח מהים = מבולגן.
תחזית (שעון ישראל, עכשיו #{now_hm}):
#{ctx}
דיווחי גולשים מהרשת:
#{people}
P
stext, = gemini(sprompt, search: false)
stext = stext.strip
write_json("summary.json", { "created" => Time.now.iso8601, "text" => stext }) unless stext.empty?
end

def people_due?
return false unless (5..21).cover?(Time.now.hour)
s = (JSON.parse(File.read(File.join(DATA_DIR, "summary.json"))) rescue nil)
t = (Time.parse(s["created"].to_s) rescue nil) if s
t.nil? || Time.now - t > 6 * 3600
end

ok = true
ok &&= update_forecast if %w[forecast all auto].include?(MODE)
if %w[people all].include?(MODE) || (MODE == "auto" && people_due?)
if ENV["GEMINI_API_KEY"].to_s.empty?
warn "GEMINI_API_KEY not set - skipping surfer reports and AI summary"
else
begin
update_people
rescue StandardError => e
warn "people/summary step failed: #{e.message}"
end
end
end
exit(ok ? 0 : 1)
