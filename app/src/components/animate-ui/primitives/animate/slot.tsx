'use client';

import * as React from 'react';
import { motion, isMotionComponent, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type AnyProps = Record<string, unknown>;

type DOMMotionProps<T extends HTMLElement = HTMLElement> = Omit<
  HTMLMotionProps<keyof HTMLElementTagNameMap>,
  'ref'
> & { ref?: React.Ref<T> };

type WithAsChild<Base extends object> =
  | (Base & { asChild: true; children: React.ReactElement })
  | (Base & { asChild?: false | undefined });

type SlotProps<T extends HTMLElement = HTMLElement> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
} & DOMMotionProps<T>;

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.RefObject<T | null>).current = node;
      }
    });
  };
}

function mergeProps<T extends HTMLElement>(
  childProps: AnyProps,
  slotProps: DOMMotionProps<T>,
): AnyProps {
  const merged: AnyProps = { ...childProps, ...slotProps };

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className as string,
      slotProps.className as string,
    );
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style as React.CSSProperties),
      ...(slotProps.style as React.CSSProperties),
    };
  }

  return merged;
}

const motionElements = new Map<React.ElementType, React.ElementType>();

function getMotionElement(element: React.ElementType) {
  let motionElement = motionElements.get(element);
  if (!motionElement) {
    motionElement = motion.create(element);
    motionElements.set(element, motionElement);
  }
  return motionElement;
}

// Animate UI registry Slot needs a dynamic host tag by design; cache its
// Motion wrapper by host so repeated renders do not recreate component types.
function MotionSlotElement({ element, elementProps, ref }: {
  element: React.ElementType;
  elementProps: AnyProps;
  ref: React.Ref<HTMLElement>;
}) {
  const MotionElement = React.useMemo(() => getMotionElement(element), [element]);
  // eslint-disable-next-line react-hooks/static-components
  return <MotionElement {...elementProps} ref={ref} />;
}

function Slot<T extends HTMLElement = HTMLElement>({
  children,
  ref,
  ...props
}: SlotProps<T>) {
  if (!React.isValidElement(children)) return null;

  const isAlreadyMotion =
    typeof children.type === 'object' &&
    children.type !== null &&
    isMotionComponent(children.type);

  const { ref: childRef, ...childProps } = children.props as AnyProps;

  const mergedProps = mergeProps(childProps, props);

  const Element = children.type as React.ElementType;
  const mergedRef = mergeRefs(childRef as React.Ref<T>, ref);
  // The downloaded Animate UI Slot delegates Motion's DOM prop handling to
  // motion.create at the call site. This is a genuine registry primitive.
  if (isAlreadyMotion) return <Element {...mergedProps} ref={mergedRef} />;
  return <MotionSlotElement element={Element} elementProps={mergedProps} ref={mergedRef} />;
}

export {
  Slot,
  type SlotProps,
  type WithAsChild,
  type DOMMotionProps,
  type AnyProps,
};
