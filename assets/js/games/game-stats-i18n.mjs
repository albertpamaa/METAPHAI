const keys=['statistics','currentStreak','bestStreak','dailyGames','bestScore','averageScore','accuracy','correct','attempts','hintsUsed','perfectGames','trainingGames'];
const entries={
  es:['Estadísticas','Racha actual','Mejor racha','Retos diarios','Mejor puntuación','Puntuación media','Acierto','Aciertos','Intentos','Pistas usadas','Partidas perfectas','Entrenamientos'],
  en:['Statistics','Current streak','Best streak','Daily games','Best score','Average score','Accuracy','Correct','Attempts','Hints used','Perfect games','Training games'],
  fr:['Statistiques','Série actuelle','Meilleure série','Défis quotidiens','Meilleur score','Score moyen','Précision','Bonnes réponses','Tentatives','Indices utilisés','Parties parfaites','Entraînements'],
  de:['Statistik','Aktuelle Serie','Beste Serie','Tagesrätsel','Bestpunktzahl','Durchschnittspunktzahl','Trefferquote','Richtig','Versuche','Verwendete Hinweise','Perfekte Spiele','Trainingsspiele'],
  it:['Statistiche','Serie attuale','Serie migliore','Sfide giornaliere','Miglior punteggio','Punteggio medio','Precisione','Risposte corrette','Tentativi','Indizi usati','Partite perfette','Allenamenti'],
  pt:['Estatísticas','Sequência atual','Melhor sequência','Desafios diários','Melhor pontuação','Pontuação média','Precisão','Respostas certas','Tentativas','Pistas usadas','Partidas perfeitas','Treinos'],
  ru:['Статистика','Текущая серия','Лучшая серия','Ежедневные игры','Лучший результат','Средний результат','Точность','Верные ответы','Попытки','Использовано подсказок','Идеальные игры','Тренировки'],
  'zh-CN':['统计数据','当前连续天数','最佳连续天数','每日挑战','最高得分','平均得分','正确率','答对','作答','使用提示','全对次数','练习次数'],
  hi:['आँकड़े','मौजूदा क्रम','सर्वश्रेष्ठ क्रम','दैनिक खेल','सर्वश्रेष्ठ स्कोर','औसत स्कोर','सटीकता','सही','प्रयास','इस्तेमाल किए संकेत','पूर्ण खेल','अभ्यास खेल'],
  ja:['統計','現在の連続日数','最高連続日数','デイリーゲーム','最高スコア','平均スコア','正答率','正解','回答数','使用したヒント','全問正解','練習回数'],
  ko:['통계','현재 연속 기록','최고 연속 기록','일일 게임','최고 점수','평균 점수','정답률','정답','시도','사용한 힌트','만점 게임','연습 게임'],
  ca:['Estadístiques','Ratxa actual','Millor ratxa','Reptes diaris','Millor puntuació','Puntuació mitjana','Encert','Encerts','Intents','Pistes utilitzades','Partides perfectes','Entrenaments'],
  ar:['الإحصاءات','السلسلة الحالية','أفضل سلسلة','التحديات اليومية','أفضل نتيجة','متوسط النتيجة','نسبة الإجابات الصحيحة','إجابات صحيحة','محاولات','تلميحات مستخدمة','ألعاب كاملة','مرات التدريب'],
  id:['Statistik','Rangkaian saat ini','Rangkaian terbaik','Permainan harian','Skor terbaik','Skor rata-rata','Akurasi','Benar','Percobaan','Petunjuk digunakan','Permainan sempurna','Permainan latihan'],
  bn:['পরিসংখ্যান','বর্তমান ধারা','সেরা ধারা','দৈনিক খেলা','সেরা স্কোর','গড় স্কোর','সঠিকতার হার','সঠিক','প্রচেষ্টা','ব্যবহৃত ইঙ্গিত','নিখুঁত খেলা','অনুশীলন খেলা']
};
export const GAME_STATS_I18N=Object.fromEntries(Object.entries(entries).map(([language,values])=>[language,Object.fromEntries(keys.map((key,index)=>[key,values[index]]))]));
export const GAME_STATS_REQUIRED_KEYS=keys;
export const gameStatsText=language=>GAME_STATS_I18N[language]||GAME_STATS_I18N.en;
