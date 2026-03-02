// Redirect: /admin/content → /admin/mayak-content
export async function getServerSideProps() {
    return {
        redirect: {
            destination: "/admin/mayak-content",
            permanent: true,
        },
    };
}

export default function ContentRedirect() {
    return null;
}
