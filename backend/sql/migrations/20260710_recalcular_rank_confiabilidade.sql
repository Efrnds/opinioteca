-- Sincroniza rank_confiabilidade com votos existentes nas avaliações.
-- Regra: upvote = +1, downvote = -1, mínimo 0 (igual a modelos.DeltaRank).

UPDATE usuarios u
SET rank_confiabilidade = GREATEST(0, COALESCE((
    SELECT SUM(CASE
        WHEN v.tipo_voto = 'upvote' THEN 1
        WHEN v.tipo_voto = 'downvote' THEN -1
        ELSE 0
    END)
    FROM voto_avaliacoes v
    INNER JOIN avaliacoes a ON a.id = v.avaliacao_id
    WHERE a.usuario_id = u.id
), 0));
