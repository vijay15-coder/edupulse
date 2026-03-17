-- SQL Script to set SuperAdmin privileges for angajalavijay8560@gmail.com
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

DO $$
DECLARE
    target_email TEXT := 'angajalavijay8560@gmail.com';
    target_password TEXT := 'vijaykumar@123';
    default_college_id UUID;
    target_user_id UUID;
BEGIN
    -- 1. Get or create a default college
    SELECT id INTO default_college_id FROM public.colleges LIMIT 1;
    
    IF default_college_id IS NULL THEN
        INSERT INTO public.colleges (name, code, subscription_status)
        VALUES ('System Administration', 'SYS-ADMIN', 'ACTIVE')
        RETURNING id INTO default_college_id;
    END IF;

    -- 2. Check if user exists in auth.users, if not, CREATE them
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        -- Create user in auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            target_email,
            crypt(target_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO target_user_id;
        
        RAISE NOTICE 'User % created in Auth table.', target_email;
    END IF;

    -- 3. Create or update profile in public schema
    INSERT INTO public.profiles (id, college_id, name, email, role)
    VALUES (target_user_id, default_college_id, 'Vijay Kumar', target_email, 'SUPERADMIN')
    ON CONFLICT (id) DO UPDATE 
    SET role = 'SUPERADMIN',
        college_id = default_college_id,
        updated_at = now();
        
    RAISE NOTICE 'User % has been successfully set as SUPERADMIN.', target_email;
END $$;
