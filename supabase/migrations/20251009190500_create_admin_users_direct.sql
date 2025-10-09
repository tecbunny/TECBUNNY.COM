-- Create admin and superadmin users using Supabase auth functions
-- This script creates both auth users and profiles in one go

DO $$
DECLARE
    admin_user_id UUID;
    superadmin_user_id UUID;
BEGIN
    -- Create admin user
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'tecbunnysolution@gmail.com';

    IF admin_user_id IS NULL THEN
        -- Create new auth user
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            user_metadata
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'tecbunnysolution@gmail.com',
            crypt('Bunny@6010', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            '{"role": "admin", "name": "Shubham Bhisaji"}'
        )
        RETURNING id INTO admin_user_id;
    END IF;

    -- Create/update admin profile
    INSERT INTO profiles (
        id,
        name,
        email,
        mobile,
        role,
        email_verified,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        admin_user_id,
        'Shubham Bhisaji',
        'tecbunnysolution@gmail.com',
        '9604136010',
        'admin',
        true,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        mobile = EXCLUDED.mobile,
        role = EXCLUDED.role,
        email_verified = EXCLUDED.email_verified,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    -- Create superadmin user
    SELECT id INTO superadmin_user_id
    FROM auth.users
    WHERE email = 'tecbunnysolutions@gmail.com';

    IF superadmin_user_id IS NULL THEN
        -- Create new auth user
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            user_metadata
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'tecbunnysolutions@gmail.com',
            crypt('Bunny@6010', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            '{"role": "superadmin", "name": "Shubham Bhisaji"}'
        )
        RETURNING id INTO superadmin_user_id;
    END IF;

    -- Create/update superadmin profile
    INSERT INTO profiles (
        id,
        name,
        email,
        mobile,
        role,
        email_verified,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        superadmin_user_id,
        'Shubham Bhisaji',
        'tecbunnysolutions@gmail.com',
        '7387375651',
        'superadmin',
        true,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        mobile = EXCLUDED.mobile,
        role = EXCLUDED.role,
        email_verified = EXCLUDED.email_verified,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

    RAISE NOTICE 'Admin users created successfully. Admin ID: %, Superadmin ID: %', admin_user_id, superadmin_user_id;
END $$;