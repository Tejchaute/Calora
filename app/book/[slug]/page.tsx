import type { Metadata } from 'next';
import { BookingPage } from '@/features/appointments/components/booking-page';

type PageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const canonical = `/book/${encodeURIComponent(slug)}`;
    return {
        title: 'Book an appointment',
        description: 'Choose a service, staff member, and available appointment time.',
        alternates: { canonical },
        openGraph: {
            title: 'Book an appointment with Calora',
            description: 'Choose a service, staff member, and available appointment time.',
            type: 'website',
            url: canonical,
        },
    };
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;

    return <BookingPage slug={slug} />;
}
