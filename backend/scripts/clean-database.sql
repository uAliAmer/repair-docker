-- Clean Database Script

-- WARNING: This will delete data permanently!

 

-- Option 1: Delete ALL repairs (use with extreme caution!)

-- Uncomment the following lines to delete everything:

 

-- BEGIN;

-- DELETE FROM notes;

-- DELETE FROM repair_history;

-- DELETE FROM repairs;

-- COMMIT;

 

-- Option 2: Delete test repairs by customer name

BEGIN;

 

-- Show what will be deleted first

SELECT

  repair_id,

  customer_name,

  device,

  created_at

FROM repairs

WHERE

  customer_name ILIKE '%test%' OR

  customer_name ILIKE '%تجربة%' OR

  customer_name = 'علي' OR

  customer_name LIKE '%ااابببب%';

 

-- Delete related notes

DELETE FROM notes

WHERE repair_id IN (

  SELECT id FROM repairs

  WHERE

    customer_name ILIKE '%test%' OR

    customer_name ILIKE '%تجربة%' OR

    customer_name = 'علي' OR

    customer_name LIKE '%ااابببب%'

);

 

-- Delete related history

DELETE FROM repair_history

WHERE repair_id IN (

  SELECT id FROM repairs

  WHERE

    customer_name ILIKE '%test%' OR

    customer_name ILIKE '%تجربة%' OR

    customer_name = 'علي' OR

    customer_name LIKE '%ااابببب%'

);

 

-- Delete repairs

DELETE FROM repairs

WHERE

  customer_name ILIKE '%test%' OR

  customer_name ILIKE '%تجربة%' OR

  customer_name = 'علي' OR

  customer_name LIKE '%ااابببب%';

 

COMMIT;

 

-- Option 3: Delete specific repair IDs

-- Uncomment and modify the following:

 

-- BEGIN;

-- DELETE FROM notes WHERE repair_id IN (

--   SELECT id FROM repairs WHERE repair_id IN ('97565100', '108125333')

-- );

-- DELETE FROM repair_history WHERE repair_id IN (

--   SELECT id FROM repairs WHERE repair_id IN ('97565100', '108125333')

-- );

-- DELETE FROM repairs WHERE repair_id IN ('97565100', '108125333');

-- COMMIT;

 

-- Option 4: Delete by date range

-- Uncomment and modify the following:

 

-- BEGIN;

-- DELETE FROM notes WHERE repair_id IN (

--   SELECT id FROM repairs WHERE created_at < '2025-11-14'

-- );

-- DELETE FROM repair_history WHERE repair_id IN (

--   SELECT id FROM repairs WHERE created_at < '2025-11-14'

-- );

-- DELETE FROM repairs WHERE created_at < '2025-11-14';

-- COMMIT;

 

-- View remaining repairs count

SELECT COUNT(*) as total_repairs FROM repairs;

 
