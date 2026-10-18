-- ============================================================================
-- Migration 000003: Transactional Proposal Moderation & Verification RPC
-- Compliant with Specifications v1.0 (Sections 7, 14.5)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.review_proposal_transaction(
    p_proposal_id UUID,
    p_decision TEXT, -- 'accept', 'reject', 'needs_information'
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_proposal RECORD;
    v_new_person_id UUID;
    v_new_rel_id UUID;
    v_target_person_id UUID;
    v_target_rel_id UUID;
    v_payload JSONB;
    v_res JSONB;
BEGIN
    -- 1. Security Check: Admin role required
    IF NOT public.is_admin(v_admin_id) THEN
        RAISE EXCEPTION 'Accès refusé : seuls les administrateurs peuvent modérer les propositions.';
    END IF;

    -- 2. Validate decision argument
    IF p_decision NOT IN ('accept', 'reject', 'needs_information') THEN
        RAISE EXCEPTION 'Décision invalide : % (valeurs admises: accept, reject, needs_information)', p_decision;
    END IF;

    -- 3. Lock Proposal row to prevent concurrent moderation
    SELECT * INTO v_proposal
    FROM public.proposals
    WHERE id = p_proposal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposition introuvable (ID: %)', p_proposal_id;
    END IF;

    IF v_proposal.status IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Cette proposition a déjà été traitée avec le statut : %', v_proposal.status;
    END IF;

    v_payload := v_proposal.payload;

    -- 4. Process Rejection
    IF p_decision = 'reject' THEN
        UPDATE public.proposals
        SET status = 'rejected',
            reviewed_by = v_admin_id,
            reviewed_at = timezone('utc'::text, now()),
            review_comment = p_comment,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_proposal_id;

        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_admin_id,
            'reject_proposal',
            'proposal',
            p_proposal_id,
            jsonb_build_object(
                'proposal_type', v_proposal.proposal_type,
                'submitted_by', v_proposal.submitted_by,
                'comment', p_comment
            )
        );

        RETURN jsonb_build_object(
            'success', TRUE,
            'status', 'rejected',
            'proposal_id', p_proposal_id
        );
    END IF;

    -- 5. Process Request for Additional Information
    IF p_decision = 'needs_information' THEN
        UPDATE public.proposals
        SET status = 'needs_information',
            reviewed_by = v_admin_id,
            reviewed_at = timezone('utc'::text, now()),
            review_comment = p_comment,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_proposal_id;

        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_admin_id,
            'request_info_proposal',
            'proposal',
            p_proposal_id,
            jsonb_build_object(
                'proposal_type', v_proposal.proposal_type,
                'submitted_by', v_proposal.submitted_by,
                'comment', p_comment
            )
        );

        RETURN jsonb_build_object(
            'success', TRUE,
            'status', 'needs_information',
            'proposal_id', p_proposal_id
        );
    END IF;

    -- 6. Process Acceptance (Atomically applying official changes)
    IF p_decision = 'accept' THEN
        CASE v_proposal.proposal_type

            -- 6.1 Add New Person
            WHEN 'add_person' THEN
                INSERT INTO public.persons (
                    first_names,
                    last_name,
                    name_variants,
                    gender,
                    birth_date,
                    birth_date_precision,
                    birth_year,
                    birth_place,
                    death_date,
                    death_date_precision,
                    death_year,
                    death_place,
                    life_status,
                    visibility,
                    profession,
                    biography,
                    notes,
                    created_by
                ) VALUES (
                    TRIM((v_payload->>'first_names')::TEXT),
                    TRIM((v_payload->>'last_name')::TEXT),
                    COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload->'name_variants')), '{}'::TEXT[]),
                    v_payload->>'gender',
                    (v_payload->>'birth_date')::DATE,
                    COALESCE((v_payload->>'birth_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'birth_year')::INTEGER,
                    v_payload->>'birth_place',
                    (v_payload->>'death_date')::DATE,
                    COALESCE((v_payload->>'death_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'death_year')::INTEGER,
                    v_payload->>'death_place',
                    COALESCE((v_payload->>'life_status')::life_status, 'unknown'),
                    COALESCE((v_payload->>'visibility')::visibility_status, 'private'),
                    v_payload->>'profession',
                    v_payload->>'biography',
                    v_payload->>'notes',
                    v_proposal.submitted_by
                )
                RETURNING id INTO v_new_person_id;

                -- Update proposal with target and accepted status
                UPDATE public.proposals
                SET status = 'accepted',
                    target_person_id = v_new_person_id,
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_add_person',
                    'person',
                    v_new_person_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id,
                        'submitted_by', v_proposal.submitted_by,
                        'name', (v_payload->>'first_names') || ' ' || (v_payload->>'last_name')
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_person_id', v_new_person_id
                );

            -- 6.2 Update Existing Person
            WHEN 'update_person' THEN
                v_target_person_id := v_proposal.target_person_id;
                IF v_target_person_id IS NULL THEN
                    RAISE EXCEPTION 'Impossible d''accepter : target_person_id manquant pour une mise à jour de personne.';
                END IF;

                UPDATE public.persons
                SET first_names = COALESCE(NULLIF(TRIM(v_payload->>'first_names'), ''), first_names),
                    last_name = COALESCE(NULLIF(TRIM(v_payload->>'last_name'), ''), last_name),
                    name_variants = CASE 
                        WHEN v_payload ? 'name_variants' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'name_variants'))
                        ELSE name_variants
                    END,
                    gender = COALESCE(v_payload->>'gender', gender),
                    birth_date = CASE WHEN v_payload ? 'birth_date' THEN (v_payload->>'birth_date')::DATE ELSE birth_date END,
                    birth_date_precision = CASE WHEN v_payload ? 'birth_date_precision' THEN (v_payload->>'birth_date_precision')::date_precision ELSE birth_date_precision END,
                    birth_year = CASE WHEN v_payload ? 'birth_year' THEN (v_payload->>'birth_year')::INTEGER ELSE birth_year END,
                    birth_place = CASE WHEN v_payload ? 'birth_place' THEN v_payload->>'birth_place' ELSE birth_place END,
                    death_date = CASE WHEN v_payload ? 'death_date' THEN (v_payload->>'death_date')::DATE ELSE death_date END,
                    death_date_precision = CASE WHEN v_payload ? 'death_date_precision' THEN (v_payload->>'death_date_precision')::date_precision ELSE death_date_precision END,
                    death_year = CASE WHEN v_payload ? 'death_year' THEN (v_payload->>'death_year')::INTEGER ELSE death_year END,
                    death_place = CASE WHEN v_payload ? 'death_place' THEN v_payload->>'death_place' ELSE death_place END,
                    life_status = CASE WHEN v_payload ? 'life_status' THEN (v_payload->>'life_status')::life_status ELSE life_status END,
                    visibility = CASE WHEN v_payload ? 'visibility' THEN (v_payload->>'visibility')::visibility_status ELSE visibility END,
                    profession = CASE WHEN v_payload ? 'profession' THEN v_payload->>'profession' ELSE profession END,
                    biography = CASE WHEN v_payload ? 'biography' THEN v_payload->>'biography' ELSE biography END,
                    notes = CASE WHEN v_payload ? 'notes' THEN v_payload->>'notes' ELSE notes END
                WHERE id = v_target_person_id;

                UPDATE public.proposals
                SET status = 'accepted',
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_update_person',
                    'person',
                    v_target_person_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id,
                        'submitted_by', v_proposal.submitted_by
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_person_id', v_target_person_id
                );

            -- 6.3 Add New Relationship
            WHEN 'add_relationship' THEN
                INSERT INTO public.relationships (
                    relationship_type,
                    person_a_id,
                    person_b_id,
                    start_date,
                    start_date_precision,
                    start_year,
                    start_place,
                    end_date,
                    end_date_precision,
                    end_year,
                    end_place,
                    notes,
                    created_by
                ) VALUES (
                    (v_payload->>'relationship_type')::relationship_type,
                    (v_payload->>'person_a_id')::UUID,
                    (v_payload->>'person_b_id')::UUID,
                    (v_payload->>'start_date')::DATE,
                    COALESCE((v_payload->>'start_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'start_year')::INTEGER,
                    v_payload->>'start_place',
                    (v_payload->>'end_date')::DATE,
                    COALESCE((v_payload->>'end_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'end_year')::INTEGER,
                    v_payload->>'end_place',
                    v_payload->>'notes',
                    v_proposal.submitted_by
                )
                RETURNING id INTO v_new_rel_id;

                UPDATE public.proposals
                SET status = 'accepted',
                    target_relationship_id = v_new_rel_id,
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_add_relationship',
                    'relationship',
                    v_new_rel_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id,
                        'relationship_type', v_payload->>'relationship_type',
                        'person_a_id', v_payload->>'person_a_id',
                        'person_b_id', v_payload->>'person_b_id'
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_relationship_id', v_new_rel_id
                );

            -- 6.4 Update Relationship
            WHEN 'update_relationship' THEN
                v_target_rel_id := v_proposal.target_relationship_id;
                IF v_target_rel_id IS NULL THEN
                    RAISE EXCEPTION 'Impossible d''accepter : target_relationship_id manquant.';
                END IF;

                UPDATE public.relationships
                SET start_date = CASE WHEN v_payload ? 'start_date' THEN (v_payload->>'start_date')::DATE ELSE start_date END,
                    start_date_precision = CASE WHEN v_payload ? 'start_date_precision' THEN (v_payload->>'start_date_precision')::date_precision ELSE start_date_precision END,
                    start_year = CASE WHEN v_payload ? 'start_year' THEN (v_payload->>'start_year')::INTEGER ELSE start_year END,
                    start_place = CASE WHEN v_payload ? 'start_place' THEN v_payload->>'start_place' ELSE start_place END,
                    end_date = CASE WHEN v_payload ? 'end_date' THEN (v_payload->>'end_date')::DATE ELSE end_date END,
                    end_date_precision = CASE WHEN v_payload ? 'end_date_precision' THEN (v_payload->>'end_date_precision')::date_precision ELSE end_date_precision END,
                    end_year = CASE WHEN v_payload ? 'end_year' THEN (v_payload->>'end_year')::INTEGER ELSE end_year END,
                    end_place = CASE WHEN v_payload ? 'end_place' THEN v_payload->>'end_place' ELSE end_place END,
                    notes = CASE WHEN v_payload ? 'notes' THEN v_payload->>'notes' ELSE notes END
                WHERE id = v_target_rel_id;

                UPDATE public.proposals
                SET status = 'accepted',
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_update_relationship',
                    'relationship',
                    v_target_rel_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_relationship_id', v_target_rel_id
                );

            ELSE
                RAISE EXCEPTION 'Type de proposition non supporté : %', v_proposal.proposal_type;
        END CASE;

        RETURN v_res;
    END IF;

    RAISE EXCEPTION 'Flux de modération inattendu.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.review_proposal_transaction TO authenticated;
