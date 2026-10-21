import { m } from "~/paraglide/messages.js";
import type { ChangeField } from "./schemas";

const FIELD: Record<ChangeField, () => string> = {
	name: m.news_field_name,
	description: m.news_field_description,
	location: m.news_field_location,
	municipality: m.news_field_municipality,
	categories: m.news_field_categories,
	relevance: m.news_field_relevance,
	scores: m.news_field_scores,
	degradationRisk: m.news_field_degradation_risk,
	geology: m.news_field_geology,
	geologicAge: m.news_field_geologic_age,
	geopark: m.news_field_geopark,
	photo: m.news_field_photo,
};

export const changeFieldLabel = (f: ChangeField) => FIELD[f]();

export const formatRunDate = (iso: string, locale: string) =>
	new Intl.DateTimeFormat(locale, {
		dateStyle: "long",
		timeZone: "America/Sao_Paulo",
	}).format(new Date(iso));
