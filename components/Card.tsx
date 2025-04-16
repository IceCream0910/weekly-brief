import { Card, CardHeader, CardBody } from "@heroui/card";
import { Image, Spacer } from "@heroui/react";
import { Link } from "@heroui/link";

interface CardProps {
    image?: string;
    title?: string;
    description?: string;
    href?: string;
}

const formatDescription = (title?: string, description?: string): string => {
    if (!description) return "";
    const plainText = description.replace(/<[^>]*>/g, "");

    const totalCharacterBudget = 100;

    const titleLength = title?.length;
    const maxDescriptionLength = Math.max(40, totalCharacterBudget - (titleLength || 0));

    if (plainText.length <= maxDescriptionLength) return plainText;

    return plainText.substring(0, maxDescriptionLength) + "...";
};

export default function CardView({ image, title, description, href }: CardProps) {
    const formattedDescription = formatDescription(title, description);

    return (
        <Link href={href} target="_blank" className="w-full h-full">
            <Card className="py-2 w-full h-full">
                {image && <CardBody className="overflow-visible py-2">
                    <Image
                        alt="Card background"
                        className="object-cover rounded-xl"
                        src={image}
                    />
                </CardBody>
                }

                <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                    {title && <h4 className="font-bold text-large mb-2">{title}</h4>}
                    {formattedDescription && <small className="text-default-500 mb-2">{formattedDescription}</small>}
                </CardHeader>
            </Card>
        </Link>
    );
}
