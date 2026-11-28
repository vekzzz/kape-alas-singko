-- The first backend kept orders in a single table with an items JSONB column. It only held trial data.
DROP TABLE IF EXISTS "orders" CASCADE;
--> statement-breakpoint
CREATE TABLE "menu_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"morning_position" smallint NOT NULL,
	"afternoon_position" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_option_groups" (
	"menu_item_id" text NOT NULL,
	"option_group_id" text NOT NULL,
	"default_value_id" bigint,
	CONSTRAINT "menu_item_option_groups_menu_item_id_option_group_id_pk" PRIMARY KEY("menu_item_id","option_group_id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"note" text,
	"base_price_centavos" integer NOT NULL,
	"tone" text NOT NULL,
	"stage_background" text NOT NULL,
	"stage_ink" text NOT NULL,
	"art" text NOT NULL,
	"coffee_ratio" real,
	"iced_only" boolean DEFAULT false NOT NULL,
	"is_sold_out" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_price_check" CHECK ("menu_items"."base_price_centavos" >= 0),
	CONSTRAINT "menu_items_art_check" CHECK ("menu_items"."art" in ('cup', 'small-cup', 'demitasse', 'mug', 'glass', 'press', 'pour-over', 'pastry')),
	CONSTRAINT "menu_items_coffee_ratio_check" CHECK ("menu_items"."coffee_ratio" is null or ("menu_items"."coffee_ratio" >= 0 and "menu_items"."coffee_ratio" <= 1))
);
--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"weekday" smallint PRIMARY KEY NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "opening_hours_weekday_check" CHECK ("opening_hours"."weekday" between 0 and 6),
	CONSTRAINT "opening_hours_order_check" CHECK ("opening_hours"."closes_at" > "opening_hours"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "option_groups_kind_check" CHECK ("option_groups"."kind" in ('single', 'toggle'))
);
--> statement-breakpoint
CREATE TABLE "option_values" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "option_values_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"group_id" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"price_delta_centavos" integer DEFAULT 0 NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "option_values_group_code_key" UNIQUE("group_id","code"),
	CONSTRAINT "option_values_id_group_key" UNIQUE("id","group_id"),
	CONSTRAINT "option_values_price_delta_check" CHECK ("option_values"."price_delta_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_item_options" (
	"order_item_id" bigint NOT NULL,
	"option_group_id" text NOT NULL,
	"option_value_id" bigint NOT NULL,
	"label" text NOT NULL,
	"price_delta_centavos" integer NOT NULL,
	CONSTRAINT "order_item_options_order_item_id_option_group_id_pk" PRIMARY KEY("order_item_id","option_group_id")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"menu_item_id" text,
	"item_name" text NOT NULL,
	"unit_price_centavos" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"line_total_centavos" integer NOT NULL,
	"note" text,
	"position" smallint NOT NULL,
	CONSTRAINT "order_items_order_position_key" UNIQUE("order_id","position"),
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" between 1 and 99),
	CONSTRAINT "order_items_prices_check" CHECK ("order_items"."unit_price_centavos" >= 0 and "order_items"."line_total_centavos" = "order_items"."unit_price_centavos" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_status_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"status" text NOT NULL,
	"actor" text NOT NULL,
	"staff_id" bigint,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_events_status_check" CHECK ("order_status_events"."status" in ('received', 'preparing', 'ready', 'collected', 'cancelled')),
	CONSTRAINT "order_status_events_actor_check" CHECK ("order_status_events"."actor" in ('customer', 'staff', 'system')),
	CONSTRAINT "order_status_events_staff_check" CHECK ("order_status_events"."actor" <> 'staff' or "order_status_events"."staff_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"number" text NOT NULL,
	"business_date" date NOT NULL,
	"idempotency_key" text NOT NULL,
	"order_type" text NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text,
	"pickup_at" timestamp with time zone NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_centavos" integer NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"cancel_reason" text,
	"payment_method" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "orders_number_business_date_key" UNIQUE("number","business_date"),
	CONSTRAINT "orders_order_type_check" CHECK ("orders"."order_type" in ('dine-in', 'take-out')),
	CONSTRAINT "orders_customer_name_check" CHECK (char_length(btrim("orders"."customer_name")) between 1 and 30),
	CONSTRAINT "orders_phone_check" CHECK ("orders"."phone" is null or "orders"."phone" ~ '^09[0-9]{9}$'),
	CONSTRAINT "orders_total_check" CHECK ("orders"."total_centavos" >= 0),
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('received', 'preparing', 'ready', 'collected', 'cancelled')),
	CONSTRAINT "orders_cancel_reason_check" CHECK ("orders"."cancel_reason" is null or "orders"."cancel_reason" in ('sold_out', 'customer_request', 'no_show', 'other')),
	CONSTRAINT "orders_cancelled_has_reason_check" CHECK (("orders"."status" = 'cancelled') = ("orders"."cancel_reason" is not null)),
	CONSTRAINT "orders_payment_method_check" CHECK ("orders"."payment_method" is null or "orders"."payment_method" in ('cash', 'gcash')),
	CONSTRAINT "orders_paid_check" CHECK (("orders"."payment_method" is null) = ("orders"."paid_at" is null))
);
--> statement-breakpoint
CREATE TABLE "shop_closures" (
	"closed_on" date PRIMARY KEY NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"timezone" text NOT NULL,
	"order_prefix" text NOT NULL,
	"slot_minutes" smallint NOT NULL,
	"min_lead_minutes" smallint NOT NULL,
	"accepting_orders" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_settings_single_row_check" CHECK ("shop_settings"."id" = 1),
	CONSTRAINT "shop_settings_slot_check" CHECK ("shop_settings"."slot_minutes" > 0 and "shop_settings"."min_lead_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email"),
	CONSTRAINT "staff_role_check" CHECK ("staff"."role" in ('barista', 'manager')),
	CONSTRAINT "staff_email_lower_check" CHECK ("staff"."email" = lower("staff"."email"))
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" bigint NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "staff_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_option_group_id_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."option_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_default_fkey" FOREIGN KEY ("default_value_id","option_group_id") REFERENCES "public"."option_values"("id","group_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_group_id_menu_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."menu_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_values" ADD CONSTRAINT "option_values_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_value_fkey" FOREIGN KEY ("option_value_id","option_group_id") REFERENCES "public"."option_values"("id","group_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_items_group_idx" ON "menu_items" USING btree ("group_id","position");--> statement-breakpoint
CREATE INDEX "order_status_events_order_idx" ON "order_status_events" USING btree ("order_id","changed_at");--> statement-breakpoint
CREATE INDEX "orders_board_idx" ON "orders" USING btree ("business_date","status","pickup_at");--> statement-breakpoint
CREATE INDEX "orders_changed_idx" ON "orders" USING btree ("business_date","updated_at");--> statement-breakpoint
CREATE INDEX "staff_sessions_staff_idx" ON "staff_sessions" USING btree ("staff_id");