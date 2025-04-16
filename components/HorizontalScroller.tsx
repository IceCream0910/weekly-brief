import React, { useState } from 'react';
import Flicking, { ChangedEvent } from '@egjs/react-flicking';
import '@egjs/react-flicking/dist/flicking.css';

interface HorizontalScrollerProps {
    children: React.ReactNode;
}

type AlignType = 'prev' | 'center' | 'next';

function HorizontalScroller({ children }: HorizontalScrollerProps) {
    const totalChildren = React.Children.count(children);
    const initialAlign: AlignType = totalChildren > 0 ? 'prev' : 'center';
    const [alignValue, setAlignValue] = useState<AlignType>(initialAlign);

    const handleChanged = (e: ChangedEvent) => {
        console.log(`Current index: ${e.index}`);
        if (totalChildren <= 1) {
            setAlignValue('center');
            return;
        }
        if (e.index === 0) {
            setAlignValue('prev');
        } else if (e.index === totalChildren - 1) {
            setAlignValue('next');
        } else {
            setAlignValue('center');
        }
    };

    return (
        <div className="-mx-6">
            <Flicking
                align={alignValue}
                bound={false}
                horizontal={true}
                circular={false}
                onChanged={handleChanged}
            >
                {React.Children.map(children, (child, index) => (
                    <div key={index} className={`flicking-panel mx-2 py-4 h-auto ${(index === 0 || index === React.Children.count(children) - 1) ? ' w-[10px]' : ' w-3/4'}`}>
                        {child}
                    </div>
                ))}
            </Flicking>
        </div>
    );
}

export default HorizontalScroller;