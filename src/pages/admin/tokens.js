// Redirect: /admin/tokens → /admin/mayak-tokens
export async function getServerSideProps() {
    return {
        redirect: {
            destination: "/admin/mayak-tokens",
            permanent: true,
        },
    };
}

export default function TokensRedirect() {
    return null;
}
