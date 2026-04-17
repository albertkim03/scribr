
import randomFacts from '@dpmcmlxxvi/randomfacts';

export default function MoreFeaturesPage() {
	
	const fact = randomFacts.make('Wall-E');

	return (
		<div className="flex items-center justify-center h-screen flex-col gap-4">

			<p>
				if you have any cool ideas or found any bugs, email me:
				<br />
				albert.kim1@student.unsw.edu.au
			</p>

			<p>
				<br />
				<br />
				anywho, this is an unreliable fact about Wall-E:
				<br />
				{fact}
			</p>

		</div>
	);
}