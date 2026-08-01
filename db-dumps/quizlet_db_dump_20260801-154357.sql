--
-- PostgreSQL database dump
--

\restrict vTmjgM8RRdkAmnW76i3YdFbqQDqRgm8Q8OzVWBnAfuE6l4HfJSf2IglMg5Hr4z2

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.password_reset_token DROP CONSTRAINT IF EXISTS password_reset_token_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.flashcard_set DROP CONSTRAINT IF EXISTS flashcard_set_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.flashcard DROP CONSTRAINT IF EXISTS flashcard_set_id_fkey;
DROP INDEX IF EXISTS public.idx_prt_token;
DROP INDEX IF EXISTS public.flyway_schema_history_s_idx;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.password_reset_token DROP CONSTRAINT IF EXISTS password_reset_token_token_key;
ALTER TABLE IF EXISTS ONLY public.password_reset_token DROP CONSTRAINT IF EXISTS password_reset_token_pkey;
ALTER TABLE IF EXISTS ONLY public.flyway_schema_history DROP CONSTRAINT IF EXISTS flyway_schema_history_pk;
ALTER TABLE IF EXISTS ONLY public.flashcard_set DROP CONSTRAINT IF EXISTS flashcard_set_pkey;
ALTER TABLE IF EXISTS ONLY public.flashcard DROP CONSTRAINT IF EXISTS flashcard_pkey;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.users_seq;
DROP TABLE IF EXISTS public.password_reset_token;
DROP SEQUENCE IF EXISTS public.prt_seq;
DROP TABLE IF EXISTS public.flyway_schema_history;
DROP TABLE IF EXISTS public.flashcard_set;
DROP SEQUENCE IF EXISTS public.flashcard_set_seq;
DROP TABLE IF EXISTS public.flashcard;
DROP SEQUENCE IF EXISTS public.flashcard_seq;
--
-- Name: flashcard_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flashcard_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flashcard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flashcard (
    id bigint DEFAULT nextval('public.flashcard_seq'::regclass) NOT NULL,
    term text NOT NULL,
    definition text NOT NULL,
    set_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: flashcard_set_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flashcard_set_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flashcard_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flashcard_set (
    id bigint DEFAULT nextval('public.flashcard_set_seq'::regclass) NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    owner_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


--
-- Name: prt_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_token (
    id bigint DEFAULT nextval('public.prt_seq'::regclass) NOT NULL,
    token character varying(255) NOT NULL,
    user_id bigint,
    expiry_date timestamp without time zone NOT NULL
);


--
-- Name: users_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint DEFAULT nextval('public.users_seq'::regclass) NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL
);


--
-- Data for Name: flashcard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flashcard (id, term, definition, set_id, created_at, updated_at) FROM stdin;
1	unfamiliar	незнакомый	1	2026-08-01 15:43:16.252264	2026-08-01 15:43:16.252264
2	informal	неофициальный	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
3	pioneering	новаторский	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
4	circuit	схема	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
5	chord	аккорд	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
6	replace	заменять	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
7	sense	ощущать	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
8	associate	объединять(ся); связывать	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
9	frustrate	расстраивать	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
10	appreciate	ценить; оценивать; принимать во внимание	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
11	overjoy	осчастливить	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
12	peak	пик	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
13	incomprehensible	непонятный	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
14	replay	переиграть	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
15	delight	радовать	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
16	ardor	пыл	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
17	cool	охлаждать	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
18	stay	пребывание	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
19	connoisseur	знаток	1	2026-08-01 15:43:16.253269	2026-08-01 15:43:16.253269
20	novelty	новинка	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
21	eternal	вечный	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
22	inevitably	неизбежно	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
23	shortcut	мелкая крошка (сорт табака)	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
24	bottom	низ; дно	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
25	profit	прибыль	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
26	elsewhere	где-то в другом месте	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
27	passionate	страстный	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
28	hurt	причинять боль	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
29	indefinitely	бесконечно	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
30	vice versa	наоборот	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
31	and so on	и так далее	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
32	reflect	отражать	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
33	workshop	мастерская	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
34	indicate	указывать	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
35	even	выравнивать (поверхность)	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
36	subject	подчинённый, подвластный	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
37	pose	представлять собой; позировать	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
38	extended	расширенный	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
39	unprecedented	беспрецедентный	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
40	clothe	одевать	1	2026-08-01 15:43:16.254264	2026-08-01 15:43:16.254264
\.


--
-- Data for Name: flashcard_set; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flashcard_set (id, title, description, is_public, owner_id, created_at, updated_at) FROM stdin;
1	01.08.2026		t	1	2026-08-01 15:43:16.303318	2026-08-01 15:43:16.303318
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	initial schema	SQL	V1__initial_schema.sql	-690681721	quizlet_user	2026-07-18 14:26:15.246523	99	t
2	3	create password reset token	SQL	V3__create_password_reset_token.sql	1571842061	quizlet_user	2026-07-18 14:26:15.416027	38	t
\.


--
-- Data for Name: password_reset_token; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_token (id, token, user_id, expiry_date) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password) FROM stdin;
1	Ruslan	marlinco263@gmail.com	$2a$10$tI6CxQtGTZRCPFDOVSMrYe7LwPPUL6dD2Mj70CXQEyVAIbMs5eqi.
\.


--
-- Name: flashcard_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flashcard_seq', 40, true);


--
-- Name: flashcard_set_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flashcard_set_seq', 1, true);


--
-- Name: prt_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prt_seq', 1, false);


--
-- Name: users_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_seq', 1, true);


--
-- Name: flashcard flashcard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcard
    ADD CONSTRAINT flashcard_pkey PRIMARY KEY (id);


--
-- Name: flashcard_set flashcard_set_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcard_set
    ADD CONSTRAINT flashcard_set_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);


--
-- Name: password_reset_token password_reset_token_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_prt_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_token ON public.password_reset_token USING btree (token);


--
-- Name: flashcard flashcard_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcard
    ADD CONSTRAINT flashcard_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.flashcard_set(id) ON DELETE CASCADE;


--
-- Name: flashcard_set flashcard_set_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcard_set
    ADD CONSTRAINT flashcard_set_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_token password_reset_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vTmjgM8RRdkAmnW76i3YdFbqQDqRgm8Q8OzVWBnAfuE6l4HfJSf2IglMg5Hr4z2

