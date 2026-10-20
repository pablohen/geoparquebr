import { zodResolver } from "@hookform/resolvers/zod";
import {
	Button,
	Group,
	NumberInput,
	SimpleGrid,
	Slider,
	Stack,
	Text,
} from "@mantine/core";
import { Crosshair, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { LocationFormSchema, type LocationFormValues } from "../schemas";

type Props = {
	/** Derived from the map viewport; the form re-syncs whenever the map moves. */
	values: LocationFormValues;
	onSubmit: (values: LocationFormValues) => void;
};

const toNumber = (v: string | number) =>
	typeof v === "number" ? v : Number.NaN;

export function LocationForm({ values, onSubmit }: Props) {
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(LocationFormSchema),
		values,
	});
	const [locating, setLocating] = useState(false);

	const useMyLocation = () => {
		if (!("geolocation" in navigator)) return;
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				setLocating(false);
				onSubmit({ ...values, lng: coords.longitude, lat: coords.latitude });
			},
			() => setLocating(false),
			{ enableHighAccuracy: false, timeout: 10_000 },
		);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} noValidate>
			<Stack gap="sm">
				<SimpleGrid cols={2} spacing="xs">
					<Controller
						control={control}
						name="lat"
						render={({ field, fieldState }) => (
							<NumberInput
								label="Latitude"
								size="xs"
								decimalScale={4}
								{...field}
								onChange={(v) => field.onChange(toNumber(v))}
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						control={control}
						name="lng"
						render={({ field, fieldState }) => (
							<NumberInput
								label="Longitude"
								size="xs"
								decimalScale={4}
								{...field}
								onChange={(v) => field.onChange(toNumber(v))}
								error={fieldState.error?.message}
							/>
						)}
					/>
				</SimpleGrid>

				<Controller
					control={control}
					name="radiusKm"
					render={({ field }) => (
						<div>
							<Text size="xs" fw={500} mb={4}>
								Raio: {field.value} km
							</Text>
							<Slider
								min={5}
								max={1000}
								step={5}
								value={field.value}
								onChange={field.onChange}
								label={(v) => `${v} km`}
								marks={[{ value: 50 }, { value: 250 }, { value: 500 }]}
							/>
						</div>
					)}
				/>

				<Group grow gap="xs" mt="xs">
					<Button
						variant="default"
						size="xs"
						leftSection={<Crosshair size={14} />}
						loading={locating}
						onClick={useMyLocation}
					>
						Minha posição
					</Button>
					<Button
						type="submit"
						size="xs"
						leftSection={<MagnifyingGlass size={14} />}
					>
						Buscar
					</Button>
				</Group>
			</Stack>
		</form>
	);
}
