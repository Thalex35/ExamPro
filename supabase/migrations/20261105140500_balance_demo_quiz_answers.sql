update private.demo_quiz_questions q
set
  options_fr = answer_map.options_fr,
  options_ht = answer_map.options_ht,
  correct_index = answer_map.correct_index
from (
  values
    (2, array['Un message anonyme sur un réseau social', 'Une rumeur répétée par plusieurs personnes', 'Un manuel scolaire ou un enseignant qualifié', 'Un titre sans source ni auteur']::text[], array['Yon mesaj anonim sou rezo sosyal', 'Yon rimè plizyè moun ap repete', 'Yon liv lekòl oswa yon pwofesè ki kalifye', 'Yon tit san sous ni otè']::text[], 2),
    (3, array['Écrire seulement « parce que c’est vrai »', 'Expliquer le raisonnement avec des faits ou des étapes vérifiables', 'Ajouter des détails sans rapport', 'Laisser la justification vide']::text[], array['Ekri sèlman « paske se vre »', 'Eksplike rezònman an avèk reyalite oswa etap moun ka verifye', 'Ajoute detay ki pa gen rapò', 'Kite jistifikasyon an vid']::text[], 1),
    (4, array['Relire sans interruption sans se poser de question', 'Surligner toutes les phrases', 'Remettre la révision à la veille de l’examen', 'Fermer le cours et essayer de restituer les idées de mémoire']::text[], array['Relire san rete san poze tèt ou kesyon', 'Souliye tout fraz yo', 'Tann lavèy egzamen an pou revize', 'Fèmen kou a epi eseye sonje lide yo san gade']::text[], 3),
    (5, array['Effacer le résultat sans vérifier', 'Le garder parce que tout calcul est forcément juste', 'Vérifier les étapes, les données et les unités utilisées', 'Changer une donnée au hasard']::text[], array['Efase rezilta a san verifye', 'Kenbe l paske tout kalkil toujou kòrèk', 'Verifye etap yo, done yo ak inite ou itilize yo', 'Chanje yon done o aza']::text[], 2),
    (6, array['Cette matière est la plus belle', 'La séance commence à 8 h, selon l’horaire affiché', 'Ce cours est sûrement le plus difficile', 'Tout le monde préfère cette méthode']::text[], array['Matyè sa a se pi bèl la', 'Sesyon an kòmanse a 8è, dapre orè ki afiche a', 'Se sèten kou sa a pi difisil la', 'Tout moun prefere metòd sa a']::text[], 1),
    (7, array['Choisir celle qui semble la plus compliquée', 'Mélanger les deux sans vérifier', 'Ne pas montrer son raisonnement', 'Choisir une méthode correcte et efficace, puis pouvoir l’expliquer']::text[], array['Chwazi sa ki sanble pi konplike a', 'Melanje toude san verifye', 'Pa montre rezònman an', 'Chwazi yon metòd ki kòrèk e efikas, epi kapab esplike l']::text[], 3),
    (8, array['Tout apprendre en une seule longue séance', 'Répartir les séances et revenir plusieurs fois sur les notions', 'Réviser uniquement les sujets déjà maîtrisés', 'Attendre de ne plus avoir de temps']::text[], array['Aprann tout bagay nan yon sèl sesyon ki long', 'Separe sesyon yo epi retounen sou chak sijè plizyè fwa', 'Revize sèlman sijè ou deja metrize yo', 'Tann jiskaske pa rete tan']::text[], 1),
    (9, array['Uniquement la dernière ligne', 'La couleur du fond', 'Le titre, les en-têtes et les unités', 'Une valeur choisie au hasard']::text[], array['Dènye liy lan sèlman', 'Koulè fon an', 'Tit la, tit kolòn yo ak inite yo', 'Yon valè yo chwazi o aza']::text[], 2),
    (10, array['Mémoriser seulement la bonne lettre', 'Abandonner toute la matière', 'Cacher l’erreur sans la revoir', 'Comprendre l’erreur, corriger la méthode et réessayer']::text[], array['Sonje bon lèt la sèlman', 'Abandone tout matyè a', 'Kache erè a san w pa revize l', 'Konprann erè a, korije metòd la epi eseye ankò']::text[], 3)
) as answer_map(sort_order, options_fr, options_ht, correct_index)
where q.sort_order = answer_map.sort_order;
