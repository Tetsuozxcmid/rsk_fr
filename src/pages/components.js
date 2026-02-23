import Header from "@/components/layout/Header";
import Layout from "@/components/layout/Layout";
import Button from "@/components/ui/Button";
import Input from '@/components/ui/Input/Input'
import Switcher from "@/components/ui/Switcher";
export default function Components() {
    return (
        <Layout>
            <Header>
                <Header.Heading>Российское Содружество Колледжей</Header.Heading>
            </Header>
            <div className="hero overflow-hidden" style={{ placeItems: "center" }}>
                <div className="h-screen w-full col-span-12 flex gap-[1.5rem]">
                    <div className="flex flex-col gap-4">
                        <Input type="radio" big />
                        <Input type="radio" />
                        <Input type="radio" small />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Input type="checkbox" big />
                        <Input type="checkbox" />
                        <Input type="checkbox" small />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Button big></Button>
                        <Button></Button>
                        <Button small></Button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Input></Input>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Switcher big>
                            <Switcher.Option className="active w-fit">В рот</Switcher.Option>
                            <Switcher.Option></Switcher.Option>
                        </Switcher>
                        <Switcher>
                            <Switcher.Option className="active w-fit">В жопу</Switcher.Option>
                            <Switcher.Option></Switcher.Option>
                        </Switcher>
                        <Switcher className="w-fit" small>
                            <Switcher.Option className="active w-fit">у</Switcher.Option>
                            <Switcher.Option></Switcher.Option>
                        </Switcher>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
