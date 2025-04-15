import React from 'react';
import Flicking from '@egjs/react-flicking';
import '@egjs/react-flicking/dist/flicking.css';

interface HorizontalScrollerProps {
    children: React.ReactNode;
}

function HorizontalScroller({ children }: HorizontalScrollerProps) {
    return (
        <div className="-mx-6">
            <Flicking
                align="prev"
                bound={false}
                horizontal={true}
                circular={false}
                viewportpadding="0 0 0 10px"
            >
                {React.Children.map(children, (child, index) => (
                    <div key={index} className={`flicking-panel mr-4 py-4 ${(index === 0) ? 'w-[10px]' : 'w-1/2'}`}>
                        {child}
                    </div>
                ))}
            </Flicking>
        </div>
    );
}

export default HorizontalScroller;