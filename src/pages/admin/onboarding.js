export async function getServerSideProps() {
    return {
        redirect: {
            destination: "/admin/mayak-onboarding",
            permanent: false,
        },
    };
}

export default function AdminOnboardingRedirect() {
    return null;
}
