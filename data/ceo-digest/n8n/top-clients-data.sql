select json_build_object(
     'meta', (select row_to_json(m) from ceo_digest_demo.fn_meta() m)
    ,'top',  (select json_agg(t order by t.rank) from ceo_digest_demo.fn_top_customers_period($1::date, $2::date, $3::text, $4::int) t)
) as data
