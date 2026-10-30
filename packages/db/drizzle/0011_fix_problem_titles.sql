-- linkCatalog meant to strip LeetCode's "123. " prefix but its regex lost its
-- backslashes in a JS template literal. Clean up the titles it already stored.
UPDATE "problems" SET "title" = regexp_replace("title", '^[0-9]+[.][[:space:]]+', '')
WHERE "canonical_slug" !~ ':' AND "title" ~ '^[0-9]+[.][[:space:]]';

-- DsaKaro
